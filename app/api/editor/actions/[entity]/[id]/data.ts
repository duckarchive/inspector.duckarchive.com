import prisma from "@/lib/db";
import { EditorEntity, decodeNote } from "@/lib/editor-actions";
import { Prisma } from "@generated/prisma/client/client";

export class ActionExecutionError extends Error {
  status: number;
  constructor(message: string, status = 422) {
    super(message);
    this.status = status;
  }
}

type Tx = Prisma.TransactionClient;

interface ActionRecord {
  id: string;
  type: string;
  note: string | null;
  resolved_at: Date | null;
  online_copy_id?: string | null;
  fond_id?: string | null;
  inventory_id?: string | null;
  file_id?: string | null;
}

const loadAction = async (entity: EditorEntity, id: string): Promise<ActionRecord | null> => {
  switch (entity) {
    case "fond":
      return prisma.fondActions.findUnique({ where: { id } });
    case "inventory":
      return prisma.inventoryActions.findUnique({ where: { id } });
    case "file":
      return prisma.fileActions.findUnique({ where: { id } });
  }
};

/** Match an online-copy URL to a Resource by hostname. */
const inferResourceId = async (tx: Tx, url: string): Promise<string> => {
  let host: string;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    throw new ActionExecutionError("Некоректний URL онлайн-копії");
  }
  const resources = await tx.resource.findMany({ where: { url: { not: null } }, select: { id: true, url: true } });
  const match = resources.find((r) => {
    try {
      const rHost = new URL(r.url as string).hostname.replace(/^www\./, "");
      return host.includes(rHost) || rHost.includes(host);
    } catch {
      return false;
    }
  });
  if (!match) {
    throw new ActionExecutionError(`Не вдалося визначити ресурс для ${host}`);
  }
  return match.id;
};

/** Apply the catalog mutation described by an action. Returns the created copy id (add_online_copy). */
const applyMutation = async (tx: Tx, entity: EditorEntity, action: ActionRecord): Promise<string | null> => {
  const decoded = decodeNote(action.note);
  const payload = decoded && !("raw" in decoded) ? decoded : null;
  const rawNote = decoded && "raw" in decoded ? decoded.raw : null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const value = payload?.value as any;

  const targetId =
    entity === "fond" ? action.fond_id : entity === "inventory" ? action.inventory_id : action.file_id;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateTarget = (data: any) => {
    if (!targetId) throw new ActionExecutionError("Дія не містить цілі");
    if (entity === "fond") return tx.fond.update({ where: { id: targetId }, data });
    if (entity === "inventory") return tx.inventory.update({ where: { id: targetId }, data });
    return tx.file.update({ where: { id: targetId }, data });
  };

  const requireTarget = () => {
    if (!targetId) throw new ActionExecutionError("Дія не містить цілі");
    return targetId;
  };

  switch (action.type) {
    case "report":
      return null;

    case "change_title":
      await updateTarget({ title: value });
      return null;
    case "change_code": {
      await updateTarget({ code: value });
      const codeTarget = requireTarget();
      if (entity === "file") {
        const file = await tx.file.findUnique({
          where: { id: codeTarget },
          select: { inventory: { select: { code: true, fond: { select: { code: true, archive: { select: { code: true } } } } } } },
        });
        if (file) {
          const { code: invCode, fond: { code: fondCode, archive: { code: archCode } } } = file.inventory;
          await tx.file.update({ where: { id: codeTarget }, data: { full_code: `${archCode}-${fondCode}-${invCode}-${value}` } });
        }
      } else if (entity === "inventory") {
        const inventory = await tx.inventory.findUnique({
          where: { id: codeTarget },
          select: { fond: { select: { code: true, archive: { select: { code: true } } } } },
        });
        if (inventory) {
          const { code: fondCode, archive: { code: archCode } } = inventory.fond;
          const files = await tx.file.findMany({ where: { inventory_id: codeTarget }, select: { id: true, code: true } });
          for (const file of files) {
            await tx.file.update({ where: { id: file.id }, data: { full_code: `${archCode}-${fondCode}-${value}-${file.code}` } });
          }
        }
      } else {
        const fond = await tx.fond.findUnique({ where: { id: codeTarget }, select: { archive: { select: { code: true } } } });
        if (fond) {
          const inventories = await tx.inventory.findMany({ where: { fond_id: codeTarget }, select: { id: true, code: true } });
          for (const inv of inventories) {
            const files = await tx.file.findMany({ where: { inventory_id: inv.id }, select: { id: true, code: true } });
            for (const file of files) {
              await tx.file.update({ where: { id: file.id }, data: { full_code: `${fond.archive.code}-${value}-${inv.code}-${file.code}` } });
            }
          }
        }
      }
      return null;
    }
    case "change_info":
      await updateTarget({ info: value });
      return null;
    case "change_parent": {
      if (entity === "fond") await updateTarget({ archive_id: value });
      else if (entity === "inventory") await updateTarget({ fond_id: value });
      else {
        // For files, update inventory_id and recalculate full_code
        const fileId = requireTarget();
        const file = await tx.file.findUnique({
          where: { id: fileId },
          select: { code: true },
        });
        if (!file) throw new ActionExecutionError("Справа не знайдена");

        // Get the new inventory with its parent chain to build full_code
        const newInventory = await tx.inventory.findUnique({
          where: { id: value },
          select: {
            code: true,
            fond: { select: { code: true, archive: { select: { code: true } } } },
          },
        });
        if (!newInventory) throw new ActionExecutionError("Новий опис не знайдений");

        const archiveCode = newInventory.fond.archive.code || "";
        const fondCode = newInventory.fond.code || "";
        const inventoryCode = newInventory.code || "";
        const fullCode = `${archiveCode}-${fondCode}-${inventoryCode}-${file.code}`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await updateTarget({ inventory_id: value, full_code: fullCode } as any);
      }
      return null;
    }

    case "add_year_range": {
      const id = requireTarget();
      const data = { start_year: value.start_year, end_year: value.end_year };
      if (entity === "fond") await tx.fondYear.create({ data: { fond_id: id, ...data } });
      else if (entity === "inventory") await tx.inventoryYear.create({ data: { inventory_id: id, ...data } });
      else await tx.fileYear.create({ data: { file_id: id, ...data } });
      return null;
    }
    case "remove_year_range": {
      const id = requireTarget();
      const where = { start_year: value.start_year, end_year: value.end_year };
      if (entity === "fond") await tx.fondYear.deleteMany({ where: { fond_id: id, ...where } });
      else if (entity === "inventory") await tx.inventoryYear.deleteMany({ where: { inventory_id: id, ...where } });
      else await tx.fileYear.deleteMany({ where: { file_id: id, ...where } });
      return null;
    }

    case "connect_to_online_copy": {
      if (!action.online_copy_id) throw new ActionExecutionError("Дія не містить онлайн-копії");
      const id = requireTarget();
      if (entity === "inventory") await tx.inventoryOnlineCopy.update({ where: { id: action.online_copy_id }, data: { inventory_id: id } });
      else if (entity === "file") await tx.fileOnlineCopy.update({ where: { id: action.online_copy_id }, data: { file_id: id } });
      else throw new ActionExecutionError("Онлайн-копії не підтримуються для фондів");
      return null;
    }
    case "disconnect_from_online_copy": {
      if (!action.online_copy_id) throw new ActionExecutionError("Дія не містить онлайн-копії");
      if (entity === "inventory") await tx.inventoryOnlineCopy.update({ where: { id: action.online_copy_id }, data: { inventory_id: null } });
      else if (entity === "file") await tx.fileOnlineCopy.update({ where: { id: action.online_copy_id }, data: { file_id: null } });
      else throw new ActionExecutionError("Онлайн-копії не підтримуються для фондів");
      return null;
    }
    case "add_online_copy": {
      const id = requireTarget();
      const url = (rawNote ?? "").split("\n")[0].trim();
      if (!url) throw new ActionExecutionError("Дія не містить URL");
      const resourceId = await inferResourceId(tx, url);
      if (entity === "inventory") {
        const copy = await tx.inventoryOnlineCopy.create({ data: { url, resource_id: resourceId, inventory_id: id } });
        return copy.id;
      }
      if (entity === "file") {
        const copy = await tx.fileOnlineCopy.create({ data: { url, resource_id: resourceId, file_id: id } });
        return copy.id;
      }
      throw new ActionExecutionError("Онлайн-копії не підтримуються для фондів");
    }
    case "remove_online_copy": {
      if (!action.online_copy_id) throw new ActionExecutionError("Дія не містить онлайн-копії");
      if (entity === "inventory") await tx.inventoryOnlineCopy.delete({ where: { id: action.online_copy_id } });
      else if (entity === "file") await tx.fileOnlineCopy.delete({ where: { id: action.online_copy_id } });
      else throw new ActionExecutionError("Онлайн-копії не підтримуються для фондів");
      return null;
    }

    case "connect_to_author": {
      if (entity !== "file") throw new ActionExecutionError("Автори підтримуються лише для справ");
      const fileId = requireTarget();
      if (!payload?.author_id) throw new ActionExecutionError("Дія не містить автора");
      await tx.fileAuthor.upsert({
        where: { file_id_author_id: { file_id: fileId, author_id: payload.author_id } },
        create: { file_id: fileId, author_id: payload.author_id },
        update: {},
      });
      return null;
    }
    case "disconnect_from_author": {
      if (entity !== "file") throw new ActionExecutionError("Автори підтримуються лише для справ");
      const fileId = requireTarget();
      if (!payload?.author_id) throw new ActionExecutionError("Дія не містить автора");
      await tx.fileAuthor.deleteMany({ where: { file_id: fileId, author_id: payload.author_id } });
      return null;
    }
    case "add_author": {
      if (entity !== "file") throw new ActionExecutionError("Автори підтримуються лише для справ");
      const fileId = requireTarget();
      const author = await tx.author.create({ data: { title: value } });
      await tx.fileAuthor.create({ data: { file_id: fileId, author_id: author.id } });
      return null;
    }
    case "remove_author": {
      if (!payload?.author_id) throw new ActionExecutionError("Дія не містить автора");
      await tx.fileAuthor.deleteMany({ where: { author_id: payload.author_id } });
      await tx.author.delete({ where: { id: payload.author_id } });
      return null;
    }

    case "change_author_title":
    case "change_author_info":
    case "change_author_tags":
    case "change_author_location": {
      if (!payload?.author_id) throw new ActionExecutionError("Дія не містить автора");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any;
      if (action.type === "change_author_title") data = { title: value };
      else if (action.type === "change_author_info") data = { info: value };
      else if (action.type === "change_author_tags") data = { tags: value };
      else data = { lat: value?.lat ?? null, lng: value?.lng ?? null };
      await tx.author.update({ where: { id: payload.author_id }, data });
      return null;
    }

    case "add_location": {
      if (entity !== "file") throw new ActionExecutionError("Локації підтримуються лише для справ");
      const fileId = requireTarget();
      await tx.fileLocation.create({ data: { file_id: fileId, lat: value.lat, lng: value.lng, radius_m: value.radius_m ?? 0 } });
      return null;
    }
    case "remove_location": {
      if (entity !== "file") throw new ActionExecutionError("Локації підтримуються лише для справ");
      const fileId = requireTarget();
      await tx.fileLocation.deleteMany({ where: { file_id: fileId, lat: value.lat, lng: value.lng, radius_m: value.radius_m ?? 0 } });
      return null;
    }

    case "remove": {
      const id = requireTarget();
      if (entity === "fond") {
        await tx.fond.delete({ where: { id } });
      } else if (entity === "inventory") {
        await tx.inventory.delete({ where: { id } });
      } else {
        await tx.file.delete({ where: { id } });
      }
      return null;
    }

    case "merge_to": {
      const sourceId = requireTarget();
      const targetId = value as string;
      if (!targetId) throw new ActionExecutionError("Дія не містить цілі для об'єднання");
      if (sourceId === targetId) throw new ActionExecutionError("Не можна об'єднати запис із самим собою");

      if (entity === "fond") {
        await tx.inventory.updateMany({ where: { fond_id: sourceId }, data: { fond_id: targetId } });
        await tx.fond.delete({ where: { id: sourceId } });
      } else if (entity === "inventory") {
        const files = await tx.file.findMany({ where: { inventory_id: sourceId }, select: { id: true, code: true } });
        const newInventory = await tx.inventory.findUnique({
          where: { id: targetId },
          select: { code: true, fond: { select: { code: true, archive: { select: { code: true } } } } },
        });
        if (!newInventory) throw new ActionExecutionError("Опис-приймач не знайдений");
        const { code: invCode, fond: { code: fondCode, archive: { code: archCode } } } = newInventory;
        for (const file of files) {
          await tx.file.update({
            where: { id: file.id },
            data: { inventory_id: targetId, full_code: `${archCode}-${fondCode}-${invCode}-${file.code}` },
          });
        }
        await tx.inventory.delete({ where: { id: sourceId } });
      } else {
        const file = await tx.file.findUnique({
          where: { id: sourceId },
          select: {
            authors: { select: { author_id: true } },
            online_copies: { select: { id: true, resource_id: true, url: true, parsed: true } },
            locations: { select: { lat: true, lng: true, radius_m: true } },
            years: { select: { start_year: true, end_year: true } },
          },
        });
        if (!file) throw new ActionExecutionError("Справа не знайдена");

        for (const { author_id } of file.authors) {
          await tx.fileAuthor.upsert({
            where: { file_id_author_id: { file_id: targetId, author_id } },
            create: { file_id: targetId, author_id },
            update: {},
          });
        }
        await tx.fileAuthor.deleteMany({ where: { file_id: sourceId } });

        for (const copy of file.online_copies) {
          const duplicate = await tx.fileOnlineCopy.findFirst({
            where: { file_id: targetId, resource_id: copy.resource_id, url: copy.url, parsed: copy.parsed },
          });
          if (duplicate) {
            await tx.fileOnlineCopy.delete({ where: { id: copy.id } });
          } else {
            await tx.fileOnlineCopy.update({ where: { id: copy.id }, data: { file_id: targetId } });
          }
        }

        for (const loc of file.locations) {
          const duplicate = await tx.fileLocation.findFirst({
            where: { file_id: targetId, lat: loc.lat, lng: loc.lng, radius_m: loc.radius_m },
          });
          if (!duplicate) {
            await tx.fileLocation.create({ data: { file_id: targetId, lat: loc.lat, lng: loc.lng, radius_m: loc.radius_m } });
          }
        }

        const targetYears = await tx.fileYear.findMany({ where: { file_id: targetId }, select: { start_year: true, end_year: true } });
        for (const year of file.years) {
          if (!targetYears.some((y) => y.start_year === year.start_year && y.end_year === year.end_year)) {
            await tx.fileYear.create({ data: { file_id: targetId, start_year: year.start_year, end_year: year.end_year } });
          }
        }

        await tx.file.delete({ where: { id: sourceId } });
      }
      return null;
    }

    default:
      throw new ActionExecutionError(`Виконання дії "${action.type}" не підтримується`);
  }
};

const resolveActionRow = (tx: Tx, entity: EditorEntity, id: string, resolvedBy: string, isRejected: boolean, copyId: string | null) => {
  const data = {
    resolved_at: new Date(),
    resolved_by: resolvedBy,
    is_rejected: isRejected,
    ...(copyId ? { online_copy_id: copyId } : {}),
  };
  if (entity === "fond") return tx.fondActions.update({ where: { id }, data: { resolved_at: data.resolved_at, resolved_by: data.resolved_by, is_rejected: data.is_rejected } });
  if (entity === "inventory") return tx.inventoryActions.update({ where: { id }, data });
  return tx.fileActions.update({ where: { id }, data });
};

export const resolveAction = async (
  entity: EditorEntity,
  id: string,
  resolvedBy: string,
  resolution: "execute" | "reject",
) => {
  const action = await loadAction(entity, id);
  if (!action) {
    throw new ActionExecutionError("Дію не знайдено", 404);
  }
  if (action.resolved_at) {
    throw new ActionExecutionError("Дію вже розглянуто", 409);
  }

  return prisma.$transaction(async (tx) => {
    let copyId: string | null = null;
    // For "remove" and "merge_to", mark as resolved BEFORE executing (deleting)
    // to avoid cascade delete of the action record itself
    if ((action.type === "remove" || action.type === "merge_to") && resolution === "execute") {
      await resolveActionRow(tx, entity, id, resolvedBy, false, null);
      await applyMutation(tx, entity, action);
      return { id };
    }
    if (resolution === "execute") {
      copyId = await applyMutation(tx, entity, action);
    }
    return resolveActionRow(tx, entity, id, resolvedBy, resolution === "reject", copyId);
  });
};
