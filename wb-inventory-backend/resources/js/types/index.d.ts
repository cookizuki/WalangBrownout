export type Role = 'ADMIN' | 'INVENTORY_STAFF' | 'WAREHOUSE_STAFF';

export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
    role?: Role;
    status?: 'Active' | 'Inactive';
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
};
