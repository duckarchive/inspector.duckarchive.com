const withParams = (path: string, params: Record<string, string | undefined>): string => {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) sp.set(key, value);
  }
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
};

export const editorFondHref = (archiveCode: string, fondId?: string): string =>
  withParams("/editor/catalog/fonds", { archive: archiveCode, edit: fondId });

export const editorInventoryHref = (archiveCode: string | undefined, fondId: string, inventoryId?: string): string =>
  withParams("/editor/catalog/inventories", { archive: archiveCode, fond: fondId, edit: inventoryId });

export const editorFileHref = (
  archiveCode: string | undefined,
  fondId: string | undefined,
  inventoryId: string,
  fileId?: string,
): string =>
  withParams("/editor/catalog/files", { archive: archiveCode, fond: fondId, inventory: inventoryId, edit: fileId });
