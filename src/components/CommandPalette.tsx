import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useNavigate } from "@tanstack/react-router";
import { useSession, type Role } from "@/lib/auth";

interface PaletteItem {
  id: string;
  label: string;
  hint?: string;
  group: "Navigate" | "Actions";
  roles: Role[];
  action: () => void;
}
function item(i: PaletteItem): PaletteItem {
  return i;
}
export function CommandPalette({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [open, setOpen] = useState(false);
  const { account } = useSession();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(v => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!account) return null;

    const items: PaletteItem[] = [
    item({ id: "overview", label: "Go to Overview", group: "Navigate", roles: ["ADMIN"], action: () => onNavigate("overview") }),
    item({ id: "inventory", label: "Go to Inventory", group: "Navigate", roles: ["ADMIN", "INVENTORY_STAFF"], action: () => onNavigate("inventory") }),
    item({ id: "batches", label: "Go to Batches", group: "Navigate", roles: ["ADMIN", "INVENTORY_STAFF", "WAREHOUSE_STAFF"], action: () => onNavigate("batches") }),
    item({ id: "alerts", label: "Go to Alerts", group: "Navigate", roles: ["ADMIN", "INVENTORY_STAFF", "WAREHOUSE_STAFF"], action: () => onNavigate("alerts") }),
    item({ id: "reports", label: "Go to Reports", group: "Navigate", roles: ["ADMIN"], action: () => onNavigate("reports") }),
    item({ id: "admin", label: "Go to Admin", group: "Navigate", roles: ["ADMIN"], action: () => onNavigate("admin") }),
    item({ id: "myday", label: "Go to My Day", group: "Navigate", roles: ["INVENTORY_STAFF", "WAREHOUSE_STAFF"], action: () => onNavigate("myday") }),
    item({ id: "counts", label: "Go to Stock Counts", group: "Navigate", roles: ["INVENTORY_STAFF", "WAREHOUSE_STAFF"], action: () => onNavigate("counts") }),
    item({ id: "txlog", label: "Go to Transaction Log", group: "Navigate", roles: ["INVENTORY_STAFF"], action: () => onNavigate("txlog") }),
    item({ id: "reorder", label: "Go to Reorder Review", group: "Navigate", roles: ["INVENTORY_STAFF"], action: () => onNavigate("reorder") }),
    item({ id: "picks", label: "Go to Pick Tasks", group: "Navigate", roles: ["WAREHOUSE_STAFF"], action: () => onNavigate("picks") }),
    item({ id: "receiving", label: "Go to Receiving", group: "Navigate", roles: ["WAREHOUSE_STAFF"], action: () => onNavigate("receiving") }),
    item({ id: "focus-scan", label: "Focus scan input", hint: "Pick Tasks / Receiving", group: "Actions", roles: ["WAREHOUSE_STAFF"], action: () => {
        onNavigate("picks");
        window.setTimeout(() => document.querySelector<HTMLInputElement>("input[placeholder*='Scan']")?.focus(), 80);
      } }),
  ].filter(i => i.roles.includes(account.role));

  const run = (item: PaletteItem) => {
    item.action();
    setOpen(false);
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      className="fixed left-1/2 top-24 z-[60] w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="text-muted-foreground">⌘</span>
        <Command.Input
          placeholder="Type a command or search…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">Esc</span>
      </div>
      <Command.List className="max-h-80 overflow-y-auto p-2">
        <Command.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">No results found.</Command.Empty>

        <Command.Group heading="Navigate" className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {items.filter(i => i.group === "Navigate").map(item => (
            <Command.Item
              key={item.id}
              onSelect={() => run(item)}
              className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm data-[selected=true]:bg-muted"
            >
              <span>{item.label}</span>
              {item.hint && <span className="text-xs text-muted-foreground">{item.hint}</span>}
            </Command.Item>
          ))}
        </Command.Group>

        {items.some(i => i.group === "Actions") && (
          <Command.Group heading="Actions" className="mt-1 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {items.filter(i => i.group === "Actions").map(item => (
              <Command.Item
                key={item.id}
                onSelect={() => run(item)}
                className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm data-[selected=true]:bg-muted"
              >
                <span>{item.label}</span>
                {item.hint && <span className="text-xs text-muted-foreground">{item.hint}</span>}
              </Command.Item>
            ))}
          </Command.Group>
        )}
      </Command.List>
      <div className="border-t border-border px-4 py-2.5 text-[10px] text-muted-foreground">
        <kbd className="rounded border border-border px-1">↑↓</kbd> navigate · <kbd className="rounded border border-border px-1">↵</kbd> select · <kbd className="rounded border border-border px-1">⌘K</kbd> toggle
      </div>
    </Command.Dialog>
  );
}