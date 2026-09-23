import { useEffect, useRef, useState } from "react";
import { useOps, markNotificationRead, markAllNotificationsRead } from "@/lib/ops-store";
import { useSession } from "@/lib/auth";

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export function NotificationBell() {
  const { account } = useSession();
  const { notifications } = useOps();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!account) return null;

  const userId = Number(account.id.replace(/\D/g, "")) || 0;
  const mine = notifications.filter(n => n.userId === userId);
  const unread = mine.filter(n => !n.read).length;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label="Notifications"
        className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <span aria-hidden>🔔</span>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 && (
              <button
                onClick={() => markAllNotificationsRead(userId)}
                className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {mine.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">Nothing yet — this is where PO decisions and other updates for you will show up.</p>
            ) : (
              <ul className="divide-y divide-dashed divide-border">
                {mine.map(n => (
                  <li key={n.id}>
                    <button
                      onClick={() => markNotificationRead(n.id)}
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