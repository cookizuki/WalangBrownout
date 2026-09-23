import { Fragment } from "react";

const CAPABILITIES: { category: string; rows: { label: string; admin: boolean | "view"; inventory: boolean | "view"; warehouse: boolean | "view" }[] }[] = [
  {
    category: "Dashboard & Inventory",
    rows: [
      { label: "View Overview / KPI dashboard", admin: true, inventory: false, warehouse: false },
      { label: "View Inventory (stock levels)", admin: true, inventory: true, warehouse: false },
      { label: "Export Inventory CSV", admin: false, inventory: true, warehouse: false },
      { label: "View Batches", admin: true, inventory: "view", warehouse: "view" },
      { label: "Adjust Batches (damage / loss / correction)", admin: true, inventory: false, warehouse: true },
    ],
  },
  {
    category: "Alerts",
    rows: [
      { label: "View & acknowledge alerts", admin: true, inventory: true, warehouse: true },
    ],
  },
  {
    category: "Stock Counts",
    rows: [
      { label: "Stock counts — entry", admin: false, inventory: false, warehouse: true },
      { label: "Stock counts — review / investigate variance", admin: false, inventory: true, warehouse: false },
    ],
  },
  {
    category: "Procurement",
    rows: [
      { label: "View transaction log", admin: false, inventory: true, warehouse: false },
      { label: "Reorder review / draft purchase order", admin: false, inventory: true, warehouse: false },
      { label: "Configure seasonal reorder multipliers", admin: false, inventory: true, warehouse: false },
      { label: "Approve / reject purchase orders", admin: true, inventory: false, warehouse: false },
    ],
  },
  {
    category: "Warehouse Floor",
    rows: [
      { label: "Pick tasks (execute)", admin: false, inventory: false, warehouse: true },
      { label: "Report FIFO exception", admin: false, inventory: false, warehouse: true },
      { label: "Receiving (receive deliveries)", admin: false, inventory: false, warehouse: true },
    ],
  },
  {
    category: "Sales Orders",
    rows: [
      { label: "View sales orders", admin: true, inventory: true, warehouse: false },
    ],
  },
  {
    category: "Reports",
    rows: [
      { label: "Shrinkage, velocity, valuation, turnover", admin: true, inventory: false, warehouse: false },
      { label: "Dead stock, supplier performance", admin: true, inventory: false, warehouse: false },
      { label: "Purchase history & cost history", admin: true, inventory: false, warehouse: false },
    ],
  },
  {
    category: "Administration",
    rows: [
      { label: "Manage product catalog", admin: true, inventory: false, warehouse: false },
      { label: "Manage suppliers & locations", admin: true, inventory: false, warehouse: false },
      { label: "Manage users (create / edit / deactivate)", admin: true, inventory: false, warehouse: false },
      { label: "View audit trail", admin: true, inventory: false, warehouse: false },
    ],
  },
];

function AccessMark({ value }: { value: boolean | "view" }) {
  if (value === true) {
    return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-success"><span className="h-1.5 w-1.5 rounded-full bg-current" /> Full</span>;
  }
  if (value === "view") {
    return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-info"><span className="h-1.5 w-1.5 rounded-full bg-current" /> View only</span>;
  }
  return <span className="text-xs text-muted-foreground">—</span>;
}

export function PermissionMatrixPage() {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Access control reference — derived from actual role gates in the codebase, not aspirational
      </p>
      <div className="card-surface overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">Permission Matrix</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">What each role can view, create, or execute across the system</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-160 text-sm">
            <thead className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-5 py-3 font-semibold">Capability</th>
                <th className="px-5 py-3 font-semibold">Administrator / Manager</th>
                <th className="px-5 py-3 font-semibold">Inventory Staff</th>
                <th className="px-5 py-3 font-semibold">Warehouse Staff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dashed divide-border">
            {CAPABILITIES.map(group => (
                <Fragment key={group.category}>
                  <tr className="bg-muted/30">
                    <td colSpan={4} className="px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {group.category}
                    </td>
                  </tr>
                  {group.rows.map(row => (
                    <tr key={row.label} className="hover:bg-muted/40">
                      <td className="px-5 py-3 font-medium">{row.label}</td>
                      <td className="px-5 py-3"><AccessMark value={row.admin} /></td>
                      <td className="px-5 py-3"><AccessMark value={row.inventory} /></td>
                      <td className="px-5 py-3"><AccessMark value={row.warehouse} /></td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <p className="border-t border-border px-5 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">
          "View only" = can see the data but cannot create, edit, or act on it (e.g. Warehouse Staff sees Batches for context during picking, but cannot adjust quantities directly except through Report Adjustment)
        </p>
      </div>
    </div>
  );
}