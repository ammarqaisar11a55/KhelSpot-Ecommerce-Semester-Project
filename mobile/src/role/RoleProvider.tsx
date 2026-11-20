// Who is using the app on this phone: a player booking courts, or a venue owner
// running one. Chosen on first launch, switchable from Account.

import { createContext, use, useCallback, useState, type ReactNode } from "react";
import { readJson, writeJson } from "@/lib/storage";

export type Role = "player" | "owner";

interface RoleState {
  role: Role | null;
  setRole: (r: Role | null) => void;
}

const RoleContext = createContext<RoleState | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role | null>(() => {
    const saved = readJson<{ role: Role }>("role");
    return saved?.role === "player" || saved?.role === "owner" ? saved.role : null;
  });

  const setRole = useCallback((r: Role | null) => {
    setRoleState(r);
    writeJson("role", r ? { role: r } : {});
  }, []);

  return <RoleContext value={{ role, setRole }}>{children}</RoleContext>;
}

export function useRole(): RoleState {
  const r = use(RoleContext);
  if (!r) throw new Error("useRole must be used inside <RoleProvider>");
  return r;
}

export const homeFor = (role: Role) => (role === "owner" ? "/owner" : "/player");
