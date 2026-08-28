import prisma from "@/lib/db";
import { AddActionValue, decodeNote, EditorEntity, YearRange } from "@/lib/editor-actions";
import { ActionType } from "@generated/prisma/client/client";
import { ActionExecutionError, loadAction } from "@/app/api/editor/actions/[entity]/[id]/data";

export interface PreviewMarker {
  lat: number;
  lng: number;
  radius_m?: number;
  title?: string;
}

/** One attribute of the target, as it is now and as it will be after execute.
 * Multi-value attributes (years, authors, copies, locations) list one string
 * per item — the client diffs the two lists to highlight added/removed items. */
export interface ActionPreviewField {
  label: string;
  before: string[];
  after: string[];
  /** Coordinate fields also carry markers — the client renders each side on a map. */
  beforeMarkers?: PreviewMarker[];
  afterMarkers?: PreviewMarker[];
}

export interface ActionPreview {
  type: ActionType;
  /** Human label of the record/author the action applies to. */
  target: string | null;
  fields: ActionPreviewField[];
  /** Side effects the field diff can't show (code recalculation, cascades). */
  summary?: string;
  /** Free-text comment the action author attached. */
  text?: string;
}

interface TargetState {
  id: string;
  code: string;
  title: string | null;
  info: string | null;
  /** Full code path of the record itself. */
  label: string;
  /** Code path of the current parent. */
  parentLabel: string;
  years: string[];
}

const yearLabel = (y: YearRange) => `${y.start_year}–${y.end_year}`;

const locationLabel = (l: { lat: number; lng: number; radius_m?: number | null }) =>
  `${l.lat.toFixed(5)}, ${l.lng.toFixed(5)}${l.radius_m ? ` ±${l.radius_m}м` : ""}`;

const coordsLabel = (lat: number | null | undefined, lng: number | null | undefined): string[] =>
  lat === null || lat === undefined || lng === null || lng === undefined ? [] : [`${lat}, ${lng}`];

const scalar = (v: unknown): string[] => (v === undefined || v === null || v === "" ? [] : [String(v)]);

const asArray = <T>(v: T | T[]): T[] => (Array.isArray(v) ? v : [v]);

const dedupe = (values: string[]): string[] => Array.from(new Set(values));

const loadTargetState = async (entity: EditorEntity, id: string): Promise<TargetState | null> => {
  const years = { select: { start_year: true, end_year: true }, orderBy: { start_year: "asc" as const } };
  if (entity === "fond") {
    const fond = await prisma.fond.findUnique({
      where: { id },
      select: { id: true, code: true, title: true, info: true, archive: { select: { code: true } }, years },
    });
    if (!fond) return null;
    return {
      id: fond.id,
      code: fond.code,
      title: fond.title,
      info: fond.info,
      parentLabel: fond.archive.code,
      label: `${fond.archive.code}-${fond.code}`,
      years: fond.years.map(yearLabel),
    };
  }
  if (entity === "inventory") {
    const inventory = await prisma.inventory.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        title: true,
        info: true,
        fond: { select: { code: true, archive: { select: { code: true } } } },
        years,
      },
    });
    if (!inventory) return null;
    const parentLabel = `${inventory.fond.archive.code}-${inventory.fond.code}`;
    return {
      id: inventory.id,
      code: inventory.code,
      title: inventory.title,
      info: inventory.info,
      parentLabel,
      label: `${parentLabel}-${inventory.code}`,
      years: inventory.years.map(yearLabel),
    };
  }
  const file = await prisma.file.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      full_code: true,
      title: true,
      info: true,
      inventory: { select: { code: true, fond: { select: { code: true, archive: { select: { code: true } } } } } },
      years,
    },
  });
  if (!file) return null;
  const parentLabel = `${file.inventory.fond.archive.code}-${file.inventory.fond.code}-${file.inventory.code}`;
  return {
    id: file.id,
    code: file.code,
    title: file.title,
    info: file.info,
    parentLabel,
    label: file.full_code || `${parentLabel}-${file.code}`,
    years: file.years.map(yearLabel),
  };
};

const copyUrls = async (entity: "inventory" | "file", id: string): Promise<string[]> => {
  const copies = await prisma.onlineCopy.findMany({
    where: entity === "inventory" ? { inventory_id: id } : { file_id: id },
    select: { url: true },
    orderBy: { url: "asc" },
  });
  return copies.map((c) => c.url);
};

const fileAuthorTitles = async (fileId: string): Promise<{ id: string; title: string }[]> => {
  const rows = await prisma.fileAuthor.findMany({
    where: { file_id: fileId },
    select: { author: { select: { id: true, title: true } } },
  });
  return rows.map((r) => r.author);
};

const loadAuthor = async (id: string | undefined) => {
  if (!id) throw new ActionExecutionError("Дія не містить автора");
  const author = await prisma.author.findUnique({
    where: { id },
    select: { id: true, title: true, info: true, tags: true, lat: true, lng: true, _count: { select: { file_authors: true } } },
  });
  if (!author) throw new ActionExecutionError("Автора не знайдено", 404);
  return author;
};

/** Read-only mirror of applyMutation: what the target looks like now vs after
 * the action executes, without touching anything. */
export const buildActionPreview = async (entity: EditorEntity, id: string): Promise<ActionPreview> => {
  const action = await loadAction(entity, id);
  if (!action) {
    throw new ActionExecutionError("Дію не знайдено", 404);
  }

  const decoded = decodeNote(action.note);
  const payload = decoded && !("raw" in decoded) ? decoded : null;
  const rawNote = decoded && "raw" in decoded ? decoded.raw : null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const value = payload?.value as any;
  const type = action.type as ActionType;
  const targetId =
    entity === "fond" ? action.fond_id : entity === "inventory" ? action.inventory_id : action.file_id;

  const preview = (target: string | null, fields: ActionPreviewField[], summary?: string): ActionPreview => ({
    type,
    target,
    // a field where nothing is shown on either side carries no information
    fields: fields.filter((f) => f.before.length > 0 || f.after.length > 0),
    summary,
    text: payload?.text,
  });

  const requireState = async (): Promise<TargetState> => {
    if (!targetId) throw new ActionExecutionError("Дія не містить цілі");
    const state = await loadTargetState(entity, targetId);
    if (!state) throw new ActionExecutionError("Цільовий запис не знайдено", 404);
    return state;
  };

  const requireCopyEntity = (): "inventory" | "file" => {
    if (entity === "fond") throw new ActionExecutionError("Онлайн-копії не підтримуються для фондів");
    return entity;
  };

  switch (type) {
    case "report": {
      const state = targetId ? await loadTargetState(entity, targetId) : null;
      return preview(state?.label ?? null, [], "Скарга не змінює дані автоматично — адміністратор застосовує зміни вручну.");
    }

    case "change_title": {
      const state = await requireState();
      return preview(state.label, [{ label: "Назва", before: scalar(state.title), after: scalar(value) }]);
    }
    case "change_info": {
      const state = await requireState();
      return preview(state.label, [{ label: "Опис", before: scalar(state.info), after: scalar(value) }]);
    }
    case "change_code": {
      const state = await requireState();
      const fields: ActionPreviewField[] = [{ label: "Індекс", before: [state.code], after: scalar(value) }];
      if (entity === "file") {
        fields.push({ label: "Повний код", before: [state.label], after: [`${state.parentLabel}-${value}`] });
      }
      return preview(
        state.label,
        fields,
        entity === "file" ? undefined : "Повні коди всіх справ у межах запису буде перераховано автоматично.",
      );
    }
    case "change_parent": {
      const state = await requireState();
      let newParentLabel: string | null = null;
      if (entity === "fond") {
        const archive = await prisma.archive.findUnique({ where: { id: value }, select: { code: true } });
        newParentLabel = archive?.code ?? null;
      } else if (entity === "inventory") {
        const fond = await prisma.fond.findUnique({
          where: { id: value },
          select: { code: true, archive: { select: { code: true } } },
        });
        newParentLabel = fond ? `${fond.archive.code}-${fond.code}` : null;
      } else {
        const inventory = await prisma.inventory.findUnique({
          where: { id: value },
          select: { code: true, fond: { select: { code: true, archive: { select: { code: true } } } } },
        });
        newParentLabel = inventory
          ? `${inventory.fond.archive.code}-${inventory.fond.code}-${inventory.code}`
          : null;
      }
      if (!newParentLabel) throw new ActionExecutionError("Новий батьківський запис не знайдено", 404);
      const fields: ActionPreviewField[] = [
        { label: "Батьківський запис", before: [state.parentLabel], after: [newParentLabel] },
      ];
      if (entity === "file") {
        fields.push({ label: "Повний код", before: [state.label], after: [`${newParentLabel}-${state.code}`] });
      }
      return preview(state.label, fields);
    }

    case "add_year_range":
    case "remove_year_range": {
      const state = await requireState();
      const ranges = asArray(value as YearRange | YearRange[]).map(yearLabel);
      const after =
        type === "add_year_range"
          ? dedupe([...state.years, ...ranges])
          : state.years.filter((y) => !ranges.includes(y));
      return preview(state.label, [{ label: "Роки", before: state.years, after }]);
    }

    case "connect_to_online_copy": {
      const copyEntity = requireCopyEntity();
      const state = await requireState();
      if (!action.online_copy_id) throw new ActionExecutionError("Дія не містить онлайн-копії");
      const copy = await prisma.onlineCopy.findUnique({
        where: { id: action.online_copy_id },
        select: {
          url: true,
          file: { select: { full_code: true } },
          inventory: { select: { code: true, fond: { select: { code: true, archive: { select: { code: true } } } } } },
        },
      });
      if (!copy) throw new ActionExecutionError("Онлайн-копію не знайдено", 404);
      const currentParent = copy.file
        ? copy.file.full_code
        : copy.inventory
          ? `${copy.inventory.fond.archive.code}-${copy.inventory.fond.code}-${copy.inventory.code}`
          : null;
      const before = await copyUrls(copyEntity, state.id);
      return preview(
        state.label,
        [{ label: "Онлайн-копії", before, after: dedupe([...before, copy.url]) }],
        currentParent && currentParent !== state.label
          ? `Копію буде перепривʼязано від ${currentParent}.`
          : undefined,
      );
    }
    case "disconnect_from_online_copy":
    case "remove_online_copy": {
      const copyEntity = requireCopyEntity();
      if (!action.online_copy_id) throw new ActionExecutionError("Дія не містить онлайн-копії");
      const copy = await prisma.onlineCopy.findUnique({
        where: { id: action.online_copy_id },
        select: { url: true, inventory_id: true, file_id: true },
      });
      if (!copy) throw new ActionExecutionError("Онлайн-копію не знайдено", 404);
      const summary =
        type === "remove_online_copy"
          ? "Онлайн-копію буде видалено назавжди."
          : "Копія залишиться в базі непривʼязаною.";
      // whose list shrinks: the copy's current parent (the action may carry no target)
      const parentId = copyEntity === "inventory" ? copy.inventory_id : copy.file_id;
      const state = parentId ? await loadTargetState(copyEntity, parentId) : null;
      const before = state ? await copyUrls(copyEntity, state.id) : [copy.url];
      return preview(
        state?.label ?? null,
        [{ label: "Онлайн-копії", before, after: before.filter((url) => url !== copy.url) }],
        summary,
      );
    }
    case "add_online_copy": {
      requireCopyEntity();
      const state = await requireState();
      const url = (rawNote ?? "").split("\n")[0].trim();
      if (!url) throw new ActionExecutionError("Дія не містить URL");
      const before = await copyUrls(entity as "inventory" | "file", state.id);
      return preview(state.label, [{ label: "Онлайн-копії", before, after: dedupe([...before, url]) }]);
    }

    case "connect_to_author":
    case "disconnect_from_author": {
      if (entity !== "file") throw new ActionExecutionError("Автори підтримуються лише для справ");
      const state = await requireState();
      const authorIds: string[] = payload?.author_id ? [payload.author_id] : asArray((value as string[]) ?? []);
      if (authorIds.length === 0) throw new ActionExecutionError("Дія не містить автора");
      const current = await fileAuthorTitles(state.id);
      const authors = await prisma.author.findMany({
        where: { id: { in: authorIds } },
        select: { id: true, title: true },
      });
      const missing = authorIds.length - authors.length;
      const currentTitles = current.map((a) => a.title);
      const after =
        type === "connect_to_author"
          ? dedupe([...currentTitles, ...authors.map((a) => a.title)])
          : current.filter((a) => !authorIds.includes(a.id)).map((a) => a.title);
      return preview(
        state.label,
        [{ label: "Автори", before: currentTitles, after }],
        missing > 0 ? `Авторів, яких уже не існує (видалені або обʼєднані): ${missing}.` : undefined,
      );
    }
    case "add_author": {
      if (entity !== "file") throw new ActionExecutionError("Автори підтримуються лише для справ");
      const state = await requireState();
      const titles = asArray((value as string | string[]) ?? []).map(String);
      const currentTitles = (await fileAuthorTitles(state.id)).map((a) => a.title);
      return preview(state.label, [
        { label: "Автори", before: currentTitles, after: dedupe([...currentTitles, ...titles]) },
      ]);
    }
    case "remove_author": {
      const author = await loadAuthor(payload?.author_id);
      return preview(
        author.title,
        [{ label: "Автор", before: [author.title], after: [] }],
        `Автора буде видалено; звʼязків зі справами: ${author._count.file_authors}.`,
      );
    }

    case "change_author_title": {
      const author = await loadAuthor(payload?.author_id);
      return preview(author.title, [{ label: "Назва", before: [author.title], after: scalar(value) }]);
    }
    case "change_author_info": {
      const author = await loadAuthor(payload?.author_id);
      return preview(author.title, [{ label: "Опис", before: scalar(author.info), after: scalar(value) }]);
    }
    case "change_author_tags": {
      const author = await loadAuthor(payload?.author_id);
      return preview(author.title, [
        { label: "Теги", before: author.tags, after: asArray((value as string[]) ?? []).map(String) },
      ]);
    }
    case "change_author_location": {
      const author = await loadAuthor(payload?.author_id);
      const beforeMarkers: PreviewMarker[] =
        author.lat !== null && author.lng !== null ? [{ lat: author.lat, lng: author.lng, title: author.title }] : [];
      const afterMarkers: PreviewMarker[] =
        value?.lat !== null && value?.lat !== undefined && value?.lng !== null && value?.lng !== undefined
          ? [{ lat: value.lat, lng: value.lng, title: author.title }]
          : [];
      return preview(author.title, [
        {
          label: "Координати",
          before: coordsLabel(author.lat, author.lng),
          after: coordsLabel(value?.lat, value?.lng),
          beforeMarkers,
          afterMarkers,
        },
      ]);
    }

    case "add_location":
    case "remove_location": {
      if (entity !== "file") throw new ActionExecutionError("Локації підтримуються лише для справ");
      const state = await requireState();
      const current: PreviewMarker[] = await prisma.fileLocation.findMany({
        where: { file_id: state.id },
        select: { lat: true, lng: true, radius_m: true },
        orderBy: [{ lat: "asc" }, { lng: "asc" }],
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: PreviewMarker[] = asArray(value ?? []).map((l: any) => ({
        lat: l.lat,
        lng: l.lng,
        radius_m: l.radius_m ?? 0,
      }));
      const sameLocation = (a: PreviewMarker, b: PreviewMarker) =>
        a.lat === b.lat && a.lng === b.lng && (a.radius_m ?? 0) === (b.radius_m ?? 0);
      const afterMarkers =
        type === "add_location"
          ? [...current, ...items.filter((i) => !current.some((c) => sameLocation(c, i)))]
          : current.filter((c) => !items.some((i) => sameLocation(i, c)));
      return preview(state.label, [
        {
          label: "Локації",
          before: current.map(locationLabel),
          after: afterMarkers.map(locationLabel),
          beforeMarkers: current,
          afterMarkers,
        },
      ]);
    }

    case "add": {
      const v = value as Partial<AddActionValue> | undefined;
      if (!v?.parent_id || !v?.code) throw new ActionExecutionError("Дія не містить даних для створення");
      let parentLabel: string | null = null;
      if (entity === "fond") {
        const archive = await prisma.archive.findUnique({ where: { id: v.parent_id }, select: { code: true } });
        parentLabel = archive?.code ?? null;
      } else if (entity === "inventory") {
        const fond = await prisma.fond.findUnique({
          where: { id: v.parent_id },
          select: { code: true, archive: { select: { code: true } } },
        });
        parentLabel = fond ? `${fond.archive.code}-${fond.code}` : null;
      } else {
        const inventory = await prisma.inventory.findUnique({
          where: { id: v.parent_id },
          select: { code: true, fond: { select: { code: true, archive: { select: { code: true } } } } },
        });
        parentLabel = inventory
          ? `${inventory.fond.archive.code}-${inventory.fond.code}-${inventory.code}`
          : null;
      }
      if (!parentLabel) throw new ActionExecutionError("Батьківський запис не знайдено", 404);
      return preview(`${parentLabel}-${v.code}`, [
        { label: "Батьківський запис", before: [], after: [parentLabel] },
        { label: "Індекс", before: [], after: [v.code] },
        { label: "Назва", before: [], after: scalar(v.title) },
        { label: "Опис", before: [], after: scalar(v.info) },
        { label: "Роки", before: [], after: (v.years ?? []).map(yearLabel) },
      ]);
    }

    case "remove": {
      const state = await requireState();
      let summary: string;
      if (entity === "fond") {
        const inventories = await prisma.inventory.count({ where: { fond_id: state.id } });
        summary = `Разом з фондом буде видалено його описи (${inventories}) та всі їхні справи.`;
      } else if (entity === "inventory") {
        const files = await prisma.file.count({ where: { inventory_id: state.id } });
        summary = `Разом з описом буде видалено його справи (${files}).`;
      } else {
        summary = "Разом зі справою буде видалено її роки, локації та онлайн-копії.";
      }
      return preview(
        state.label,
        [
          { label: "Індекс", before: [state.code], after: [] },
          { label: "Назва", before: scalar(state.title), after: [] },
          { label: "Опис", before: scalar(state.info), after: [] },
          { label: "Роки", before: state.years, after: [] },
        ],
        summary,
      );
    }

    case "merge_to": {
      // author merge: {author_id: source, value: target} — no file target
      if (payload?.author_id && typeof value === "string" && value) {
        const source = await loadAuthor(payload.author_id);
        const target = await loadAuthor(value);
        return preview(
          source.title,
          [
            { label: "Автори", before: [source.title, target.title], after: [target.title] },
            {
              label: "Справ у приймача",
              before: [String(target._count.file_authors)],
              after: [`до ${target._count.file_authors + source._count.file_authors}`],
            },
          ],
          "Справи джерела буде перелінковано на приймача, теги обʼєднано, порожні поля приймача заповнено з джерела; джерело буде видалено.",
        );
      }
      const source = await requireState();
      if (!value || typeof value !== "string") throw new ActionExecutionError("Дія не містить цілі для об'єднання");
      const target = await loadTargetState(entity, value);
      if (!target) throw new ActionExecutionError("Запис-приймач не знайдено", 404);
      return preview(
        source.label,
        [{ label: "Записи", before: [source.label, target.label], after: [target.label] }],
        "Дочірні записи, роки та онлайн-копії джерела буде перенесено до приймача (записи з однаковим індексом обʼєднано); джерело буде видалено.",
      );
    }

    default:
      throw new ActionExecutionError(`Попередній перегляд дії "${type}" не підтримується`);
  }
};
