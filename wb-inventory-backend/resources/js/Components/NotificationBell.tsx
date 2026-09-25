import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Bell } from 'lucide-react';
import { timeAgo } from '@/Components/ui-bits';
type Notification = { id: number; title: string; detail: string; read: boolean; timestamp: string };
export function NotificationBell() {
  const [mine, setMine] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const refresh = useCallback(async () => {
    try {
      const response = await axios.get<{ notifications: Notification[] }>(route('notifications.index'));
      setMine(response.data.notifications); setError('');
    } catch { setError('Could not load notifications. Reopen the bell to retry.'); }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 30000);
    const focus = () => { void refresh(); };
    window.addEventListener('focus', focus);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', focus); };
  }, [refresh]);
  useEffect(() => { if (open) void refresh(); }, [open, refresh]);
  useEffect(() => {
    const click = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false); };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', click); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', click); document.removeEventListener('keydown', key); };
  }, []);
  const markRead = async (url: string) => {
    setBusy(true);
    try { await axios.post(url); await refresh(); }
    catch { setError('Could not mark notifications as read. Please retry.'); }
    finally { setBusy(false); }
  };
  const unread = mine.filter(n => !n.read).length;
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label="Notifications" aria-expanded={open}
        className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Bell aria-hidden className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 && (
              <button
                disabled={busy} onClick={() => markRead(route('notifications.read-all'))}
                className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {error && <p role="alert" className="px-4 py-2 text-xs text-danger">{error}</p>}
            {mine.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">Nothing yet — this is where PO decisions and other updates for you will show up.</p>
            ) : (
              <ul className="divide-y divide-dashed divide-border">
                {mine.map(n => (
                  <li key={n.id}>
                    <button
                      disabled={busy} onClick={() => markRead(route('notifications.read', n.id))}
                      className={`block w-full px-4 py-3 text-left transition-colors hover:bg-muted/50 ${n.read ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold">{n.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{n.detail}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground">{timeAgo(n.timestamp)}</p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}