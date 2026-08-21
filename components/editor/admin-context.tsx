"use client";

import { createContext, useContext } from "react";

/**
 * Everyone under /editor is already an admin today (app/editor/layout.tsx
 * redirects otherwise) — but that gate has a TODO to also let in a future
 * non-admin "editor" role. This context lets admin-only affordances (like
 * deleting a record) stay restricted once that happens.
 */
const AdminContext = createContext(false);

export const AdminProvider: React.FC<{ isAdmin: boolean; children: React.ReactNode }> = ({ isAdmin, children }) => (
  <AdminContext.Provider value={isAdmin}>{children}</AdminContext.Provider>
);

export const useIsAdmin = (): boolean => useContext(AdminContext);
