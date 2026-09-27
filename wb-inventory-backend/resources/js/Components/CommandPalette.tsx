import { useEffect } from 'react';
import { Command } from 'cmdk';
import { router } from '@inertiajs/react';
import type { NavItem } from '@/Layouts/AppLayout';
export function CommandPalette({ navigation, role, open, setOpen }: { navigation: NavItem[]; role: string; open: boolean; setOpen: (open: boolean) => void }) {
  useEffect(() => { const key = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setOpen(!open); } }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, [open, setOpen]);
  const focusScan = () => { setOpen(false); const input = document.querySelector<HTMLInputElement>('input[data-scan-input]'); if (input) { requestAnimationFrame(() => input.focus()); } else { router.visit('/picks', { onSuccess: () => requestAnimationFrame(() => document.querySelector<HTMLInputElement>('input[data-scan-input]')?.focus()) }); } };
  return <Command.Dialog open={open} onOpenChange={setOpen} label="Command palette" overlayClassName="fixed inset-0 z-[60] bg-foreground/40" contentClassName="fixed left-1/2 top-24 z-[70] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
    <Command.Input aria-label="Search commands" placeholder="Type a command or search..." className="w-full border-b border-border bg-transparent px-4 py-4 text-sm outline-none" />
    <Command.List className="max-h-80 overflow-y-auto p-2"><Command.Empty className="p-6 text-center text-sm">No results found.</Command.Empty><Command.Group heading="Navigate" className="text-xs text-muted-foreground">{navigation.map(item => <Command.Item key={item.key} onSelect={() => { setOpen(false); router.visit(item.url); }} className="cursor-pointer rounded-lg px-3 py-2.5 text-sm data-[selected=true]:bg-muted">Go to {item.title}</Command.Item>)}</Command.Group>
    {role === 'WAREHOUSE_STAFF' && <Command.Group heading="Actions"><Command.Item onSelect={focusScan} className="cursor-pointer rounded-lg px-3 py-2.5 text-sm data-[selected=true]:bg-muted">Focus scan input</Command.Item></Command.Group>}</Command.List>
    <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">Arrow keys to navigate / Enter to select / Esc to close</div>
  </Command.Dialog>;
}
