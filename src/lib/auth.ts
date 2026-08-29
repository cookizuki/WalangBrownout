// Demo (front-end only) account + session store for the WalangBrownout prototype.
// No backend: accounts and the active session live in localStorage.

import { useCallback, useEffect, useState } from "react";

export type Role = "ADMIN" | "INVENTORY_STAFF" | "WAREHOUSE_STAFF";

export interface Account {
  id: string;
  name: string;
  email: string;
  username?: string;
  password: string;
  role: Role;
  createdAt: string;
}

/** Shared password for the seeded demo accounts. */
export const DEMO_PASSWORD = "walangbrownout";

export const ROLES: { key: Role; label: string; blurb: string; scope: string[] }[] = [
  {
    key: "ADMIN",
    label: "Administrator / Manager",
    blurb: "Full command center — KPIs, ABC catalog, FIFO batches, every alert.",
    scope: ["Overview", "Inventory", "Batches", "Alerts"],
  },
  {
    key: "INVENTORY_STAFF",
    label: "Inventory Staff",
    blurb: "Stock accuracy — cycle counts, variance logging, reorder review.",
    scope: ["My Day", "Stock Counts", "Reorder Review"],
  },
  {
    key: "WAREHOUSE_STAFF",
    label: "Warehouse Staff",
    blurb: "Floor execution — FIFO pick tasks, receiving, putaway locations.",
    scope: ["My Day", "Pick Tasks", "Receiving"],
  },
];

export const roleLabel = (r: Role) => ROLES.find(x => x.key === r)?.label ?? r;

const ACCOUNTS_KEY = "wb.accounts";
const SESSION_KEY = "wb.session";
const EVT = "wb-auth";

const SEED: Account[] = [
  { id: "u-1", name: "Kim Maturan", email: "kim@walangbrownout.ph", username: "kmaturan", password: DEMO_PASSWORD, role: "ADMIN", createdAt: "2026-01-04T08:00:00" },
  { id: "u-2", name: "Nick Merilles", email: "nick@walangbrownout.ph", username: "nmerilles", password: DEMO_PASSWORD, role: "ADMIN", createdAt: "2026-01-04T08:05:00" },
  { id: "u-3", name: "Lizle Ocariza", email: "lizle@walangbrownout.ph", username: "locariza", password: DEMO_PASSWORD, role: "INVENTORY_STAFF", createdAt: "2026-02-11T09:20:00" },
  { id: "u-4", name: "Nhimfa Pacao", email: "nhimfa@walangbrownout.ph", username: "npacao", password: DEMO_PASSWORD, role: "WAREHOUSE_STAFF", createdAt: "2026-02-11T09:24:00" },
];

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function emit() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVT));
}

export function listAccounts(): Account[] {
  const stored = read<Account[] | null>(ACCOUNTS_KEY, null);
  if (stored && stored.length) return stored;
  return SEED;
}

export function createAccount(input: { name: string; email: string; username?: string; password: string; role: Role }): Account {
  const accounts = listAccounts();
  const acct: Account = {
    id: `u-${Date.now()}`,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    username: input.username?.trim(),
    password: input.password,
    role: input.role,
    createdAt: new Date().toISOString(),
  };
  window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...accounts, acct]));
  emit();
  return acct;
}

export function updateAccount(id: string, updates: { name?: string; email?: string; role?: Role }): Account | null {
  const accounts = listAccounts();
  const idx = accounts.findIndex(a => a.id === id);
  if (idx === -1) return null;

  const updated: Account = {
    ...accounts[idx],
    ...(updates.name ? { name: updates.name.trim() } : {}),
    ...(updates.email ? { email: updates.email.trim().toLowerCase() } : {}),
    ...(updates.role ? { role: updates.role } : {}),
  };

  const next = [...accounts];
  next[idx] = updated;
  window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(next));
  emit();
  return updated;
}

export function emailTaken(email: string): boolean {
  return listAccounts().some(a => a.email === email.trim().toLowerCase());
}

export function signIn(id: string) {
  window.localStorage.setItem(SESSION_KEY, id);
  emit();
}

export function signOut() {
  window.localStorage.removeItem(SESSION_KEY);
  emit();
}

export function getSession(): Account | null {
  const id = readRawSessionId();
  if (!id) return null;
  return listAccounts().find(a => a.id === id) ?? null;
}

/** Client-side session hook. `ready` is false until hydration completes. */
export function useSession() {
  const [account, setAccount] = useState<Account | null>(null);
  const [ready, setReady] = useState(false);

  const sync = useCallback(() => setAccount(getSession()), []);

  useEffect(() => {
    sync();
    setReady(true);
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [sync]);

  return { account, ready, signOut };
}

// localStorage stores the session id as a raw string, not JSON.
export function readRawSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SESSION_KEY);
}

/** Credential check for the demo login form. Returns the account or null. */
export function authenticate(email: string, password: string): Account | null {
  const e = email.trim().toLowerCase();
  return listAccounts().find(a => a.email === e && a.password === password) ?? null;
}
