export type Role = 'ADMIN' | 'INVENTORY_STAFF' | 'WAREHOUSE_STAFF';

export const ROLES: { key: Role; label: string; blurb: string; scope: string[] }[] = [
    {
        key: 'ADMIN',
        label: 'Administrator / Manager',
        blurb: 'Full command center — KPIs, ABC catalog, FIFO batches, every alert.',
        scope: ['Overview', 'Inventory', 'Batches', 'Alerts'],
    },
    {
        key: 'INVENTORY_STAFF',
        label: 'Inventory Staff',
        blurb: 'Stock accuracy — cycle counts, variance logging, reorder review.',
        scope: ['My Day', 'Stock Counts', 'Reorder Review'],
    },
    {
        key: 'WAREHOUSE_STAFF',
        label: 'Warehouse Staff',
        blurb: 'Floor execution — FIFO pick tasks, receiving, putaway locations.',
        scope: ['My Day', 'Pick Tasks', 'Receiving'],
    },
];

export const roleLabel = (r: Role) => ROLES.find((x) => x.key === r)?.label ?? r;

