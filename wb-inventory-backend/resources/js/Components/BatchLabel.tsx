export function printBatchLabel(input: {
  sku: string; productName: string; batchId: string;
  quantity: number; dateReceived: string; expirationDate?: string;
}) {
  const win = window.open("", "_blank", "width=420,height=560");
  if (!win) return;

  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Batch Label — ${input.batchId}</title>
        <style>
          @page { size: 4in 3in; margin: 0.15in; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
            margin: 0; padding: 16px;
            color: #111;
          }
          .label {
            border: 2px solid #111;
            border-radius: 8px;
            padding: 14px 16px;
          }
          .brand { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #666; }
          .product { font-size: 18px; font-weight: 700; margin-top: 4px; line-height: 1.2; }
          .sku { font-family: "Courier New", monospace; font-size: 13px; color: #444; margin-top: 2px; }
          .row { display: flex; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #999; }
          .field { }
          .field-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: #888; }
          .field-value { font-family: "Courier New", monospace; font-size: 14px; font-weight: 700; margin-top: 2px; }
          .barcode {
            margin-top: 12px; text-align: center; font-family: "Courier New", monospace;
            font-size: 22px; letter-spacing: 3px; border-top: 2px solid #111; padding-top: 10px;
          }
          .expiry-warn { color: #b91c1c; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="label">
          <div class="brand">WalangBrownout · Batch Label</div>
          <div class="product">${input.productName}</div>
          <div class="sku">SKU: ${input.sku}</div>

          <div class="row">
            <div class="field">
              <div class="field-label">Batch ID</div>
              <div class="field-value">${input.batchId}</div>
            </div>
            <div class="field">
              <div class="field-label">Quantity</div>
              <div class="field-value">${input.quantity}</div>
            </div>
          </div>

          <div class="row">
            <div class="field">
              <div class="field-label">Received</div>
              <div class="field-value">${input.dateReceived}</div>
            </div>
            <div class="field">
              <div class="field-label">Expiry ${input.expirationDate ? "" : "(n/a)"}</div>
              <div class="field-value ${input.expirationDate ? "expiry-warn" : ""}">${input.expirationDate ?? "—"}</div>
            </div>
          </div>

          <div class="barcode">*${input.batchId}*</div>
        </div>
        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `);
  win.document.close();
}