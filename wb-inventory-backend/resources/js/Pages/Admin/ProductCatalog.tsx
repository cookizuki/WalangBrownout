import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { ProductFormModal, type ProductFormValues } from '@/Components/ProductFormModal';

type Product = ProductFormValues & {
  reorderQuantity: number; avgDailyUsage: number; seasonalFactor: number | null; safetyStock: number;
};

const money = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);

export default function ProductCatalog({ products }: { products: Product[] }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product>();

  return (
    <main className="mx-auto max-w-7xl space-y-2 p-4 sm:p-8">
      <Head title="Product Catalog" />
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        product catalog (System Administrator responsibility)
      </p>
      <div className="card-surface overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <h1 className="text-lg font-semibold">Products</h1>
            <p className="text-xs text-muted-foreground">{products.length} SKUs in catalog</p>
          </div>
          <button onClick={() => setShowForm(true)} className="rounded-md bg-foreground px-4 py-2 text-xs font-semibold text-background transition-opacity hover:opacity-90">+ Add Product</button>
        </div>
        <ul className="divide-y divide-dashed divide-border border-t border-border">
          {products.map(product => (
            <li key={product.sku} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium">{product.name}</div>
                <div className="font-mono text-xs text-muted-foreground">{product.sku} · Class {product.abc} · {money(product.unitCost)}</div>
              </div>
              <button onClick={() => setEditing(product)} aria-label={`Edit ${product.sku}`} className="shrink-0 text-xs font-medium underline underline-offset-4 hover:text-foreground/70">Edit</button>
            </li>
          ))}
        </ul>
        {products.length === 0 && <p className="px-5 py-4 text-sm text-muted-foreground">No products yet. Add your first product.</p>}
      </div>
      {showForm && <ProductFormModal onClose={() => setShowForm(false)} />}
      {editing && <ProductFormModal initial={editing} onClose={() => setEditing(undefined)} />}
    </main>
  );
}
