import { test, expect, type Page } from '@playwright/test';
async function login(page: Page, email: string) {
 if (!page.url().endsWith('/login')) await page.goto('/login'); await page.locator('input[type=email]').fill(email); await page.locator('input[type=password]').fill('walangbrownout');
 await page.getByRole('button', { name: 'Log In', exact: true }).click(); await page.waitForURL(/\/(overview|my-day)$/, {timeout:15000});
}
const admin = ['Overview','Inventory','Batches','Alerts','Sales Orders','Reports','PO Approvals','Product Catalog','Suppliers & Locations','Permission Matrix','Admin'];
const inventory = ['My Day','Inventory','Stock Counts','Transaction Log','Reorder Review','Sales Orders','Batches','Alerts'];
const warehouse = ['My Day','Stock Counts','Pick Tasks','Receiving','Batches','Alerts'];
for (const [email, nav] of [['kim@walangbrownout.ph',admin], ['nick@walangbrownout.ph',admin], ['lizle@walangbrownout.ph',inventory], ['nhimfa@walangbrownout.ph',warehouse]] as const) {
 test(`navigation and shell for ${email}`, async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await login(page,email);
  await expect(page.locator('main > div')).toHaveCSS('opacity','1');
  await page.screenshot({path:testInfo.outputPath('landing.png'), fullPage:true, animations:'disabled'});
  const sidebar = page.locator('aside:visible');
  await expect(sidebar.locator('nav button')).toHaveCount(nav.length);
  for (const name of nav) { await sidebar.getByRole('button', { name, exact: name !== 'Alerts' && name !== 'Admin' }).click(); await expect(page.locator('header h1')).toHaveText(name); await expect(page.locator('main')).not.toBeEmpty(); }
  await page.keyboard.press('Control+k'); await expect(page.getByRole('dialog', {name:'Command palette'})).toBeVisible();
  await page.getByRole('combobox', {name:'Command palette'}).fill('Go to Batches'); await page.getByRole('option', {name:'Go to Batches'}).click(); await expect(page.locator('header h1')).toHaveText('Batches');
  await sidebar.getByRole('button', {name:/Switch to/}).click(); await expect(page.locator('html')).toHaveClass(/dark/);
  await sidebar.getByRole('button', {name:/Switch to/}).click(); await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.getByRole('button', { name: /Notifications/ }).click(); await expect(page.getByText('Notifications',{exact:true})).toBeVisible(); await page.keyboard.press('Escape');
  if (email.startsWith('nhimfa')) { await page.keyboard.press('Control+k'); await page.getByRole('combobox', {name:'Command palette'}).fill('Focus scan'); await page.getByRole('option',{name:'Focus scan input'}).click(); await expect(page.locator('[data-scan-input]')).toBeFocused(); await page.locator('[data-scan-input]').fill('ACU-014'); await page.locator('[data-scan-input]').press('Enter'); await expect(page.getByRole('status')).toContainText('Match found'); }
  await page.setViewportSize({width:390,height:844}); await page.getByLabel('Open navigation').click(); await page.getByRole('dialog').locator('nav').getByRole('button',{name:'Batches',exact:true}).click(); await expect(page.locator('header h1')).toHaveText('Batches'); await expect(page.getByLabel('Close navigation')).not.toBeVisible();
  await page.getByLabel('Open navigation').click(); await page.getByRole('dialog').getByRole('button',{name:'Sign out'}).click(); await page.waitForURL('**/login');
  expect(errors).toEqual([]);
 });
}
test('direct forbidden URLs and inventory CSV filter', async ({page}) => {
 await login(page,'nhimfa@walangbrownout.ph'); const forbidden = await page.goto('/inventory'); expect(forbidden?.status()).toBe(403);
 await page.goto('/my-day'); await page.locator('aside:visible').getByRole('button',{name:'Sign out'}).click();
 await login(page,'lizle@walangbrownout.ph'); expect((await page.goto('/overview'))?.status()).toBe(403);
 await page.goto('/inventory'); await page.getByLabel('Search products and SKUs').fill('ACU-014'); await expect(page.locator('tbody tr')).toHaveCount(1);
 const download = page.waitForEvent('download'); await page.getByRole('button',{name:'Export CSV'}).click(); expect((await download).suggestedFilename()).toMatch(/inventory-export.*csv/);
});

async function switchAccount(page: Page, email: string) {
 await page.locator('aside:visible').getByRole('button', {name:'Sign out'}).click();
 await page.waitForURL('**/login'); await login(page,email);
}
test('warehouse receiving, picking, FIFO exceptions, counts and movements inside shell', async ({page}) => {
 await login(page,'nhimfa@walangbrownout.ph');
 await page.goto('/receiving');
 const inbound = page.getByRole('row').filter({hasText:'RC-7701'});
 await inbound.getByRole('button',{name:'Receive',exact:true}).click();
 await page.getByLabel('Quantity received').fill('10'); await page.getByLabel('Expiration date').fill('2028-12-31');
 await page.getByRole('button',{name:'Confirm receipt'}).click(); await expect(inbound).toContainText('Arrived');
 await expect(page.getByRole('button',{name:'Print label'})).toBeVisible();
 await page.getByLabel('Dismiss notification').click();
 await inbound.getByRole('button',{name:'Receive',exact:true}).click(); await page.getByLabel('Expiration date').fill('2028-12-31');
 await page.getByRole('button',{name:'Confirm receipt'}).click(); await expect(inbound).toContainText('Put Away');
 await page.goto('/picks');
 const pick = page.getByRole('row').filter({hasText:'PK-4401'});
 await pick.getByRole('button',{name:'Mark picked'}).click(); await expect(pick).toContainText('Done');
 const exception = page.getByRole('row').filter({hasText:'PK-4402'});
 await exception.getByRole('button',{name:'Report issue'}).click(); await page.getByRole('button',{name:'Flag as damaged'}).click();
 await expect(exception).not.toContainText('reassigned to B-1078'); await expect(page.getByRole('status')).toContainText('reassigned to B-1078');
 await page.goto('/counts'); const count = page.getByRole('row').filter({has:page.getByRole('cell',{name:'CC-2203',exact:true})});
 await page.getByLabel('Counted quantity for CC-2203').fill('40'); await count.getByRole('button',{name:'Submit count'}).click();
 await expect(count).toContainText('Done'); await count.getByRole('button',{name:'Request recount'}).click();
 await expect(page.getByRole('cell',{name:'CC-2203-R1',exact:true})).toBeVisible();
 await page.goto('/batches');
 const batch = page.getByRole('row').filter({hasText:'B-1090'});
 await batch.getByRole('button',{name:'Report Adjustment'}).click(); await page.getByRole('button',{name:'Correction',exact:true}).click();
 await page.getByLabel('Quantity',{exact:true}).fill('1'); await page.getByLabel('Notes').fill('Browser verification correction');
 await page.getByRole('button',{name:'Submit',exact:true}).click(); await expect(page.getByLabel('Notes')).not.toBeVisible();
 for (const label of ['Return','Write-Off','Transfer']) {
  await page.getByLabel('Quick actions').click(); await page.getByRole('button',{name:`Log a ${label}`,exact:true}).click();
  await page.getByRole('combobox',{name:'Batch',exact:true}).selectOption('B-1090'); await page.getByLabel('Quantity',{exact:true}).fill('1');
  if (label === 'Transfer') await page.getByRole('combobox',{name:'Move to location'}).selectOption('1');
  await page.getByRole('button',{name:'Submit',exact:true}).click(); await expect(page.getByRole('status')).toContainText(`Log a ${label} logged`);
 }
 await switchAccount(page,'lizle@walangbrownout.ph'); await page.goto('/counts');
 await page.getByRole('row').filter({has:page.getByRole('cell',{name:'CC-2203',exact:true})}).getByRole('button',{name:'Investigate'}).click();
 await expect(page.getByText('Related transactions',{exact:false})).toBeVisible();
 await page.goto('/transactions'); await expect(page.getByRole('table')).toContainText('Adjustment');
});

test('PO decisions, seasonal settings, notifications, and alerts inside shell', async ({page}) => {
 await login(page,'kim@walangbrownout.ph'); await page.goto('/admin/po-approvals');
 await page.getByRole('listitem').filter({hasText:'PO-2041'}).getByRole('button',{name:'Review'}).click(); await page.getByRole('button',{name:'Approve',exact:true}).click();
 await expect(page.getByRole('dialog')).not.toBeVisible(); await page.getByLabel('Notifications').click();
 await expect(page.getByText('Purchase order approved',{exact:true})).toBeVisible(); await page.getByRole('button',{name:'Mark all read'}).click();
 await expect(page.getByRole('button',{name:'Mark all read'})).not.toBeVisible(); await page.keyboard.press('Escape');
 await switchAccount(page,'lizle@walangbrownout.ph'); await page.goto('/reorder');
 const seasonal = page.locator('form').filter({hasText:'FAN-050'});
 await seasonal.getByLabel('Window start').selectOption('3'); await seasonal.getByLabel('Multiplier').fill('10'); await seasonal.getByRole('button',{name:'Save',exact:true}).click();
 await expect(seasonal.getByRole('button',{name:/Saved/})).toBeVisible();
 const fan = page.getByRole('row').filter({hasText:'FAN-050'}); await fan.getByRole('button',{name:'Draft PO'}).click(); await page.getByRole('button',{name:'Confirm Draft'}).click();
 await expect(page.getByRole('dialog')).not.toBeVisible(); await expect(fan).toContainText('Sent to Admin');
 await switchAccount(page,'nick@walangbrownout.ph'); await page.goto('/admin/po-approvals');
 await page.getByRole('button',{name:'Review'}).first().click(); await page.getByRole('button',{name:'Reject',exact:true}).click();
 await expect(page.getByRole('button',{name:'Confirm Rejection'})).toBeDisabled(); await page.getByLabel('Reason for rejection').fill('Browser verification: revise the requested quantity');
 await page.getByRole('button',{name:'Confirm Rejection'}).click(); await expect(page.getByRole('dialog')).not.toBeVisible();
 await switchAccount(page,'lizle@walangbrownout.ph'); await page.getByLabel('Notifications').click();
 await expect(page.getByText(/Browser verification: revise the requested quantity/)).toBeVisible();
 await page.getByRole('button',{name:/Purchase order rejected/}).click(); await expect(page.getByRole('button',{name:'Mark all read'})).not.toBeVisible();
 await page.keyboard.press('Escape'); await page.goto('/alerts'); const acknowledge = page.getByRole('button',{name:'Acknowledge'}).first();
 await acknowledge.click(); await expect(page.locator('header h1')).toHaveText('Alerts');
});

test('admin directory and account forms, audit and report controls inside shell', async ({page}) => {
 await login(page,'kim@walangbrownout.ph'); await page.goto('/admin/products'); await page.getByRole('button',{name:'+ Add Product',exact:true}).click();
 const dialog = page.getByRole('dialog');
 await dialog.getByLabel('SKU',{exact:true}).fill('TEST-001'); await dialog.getByLabel('Product Name').fill('Browser Test Product');
 await dialog.getByLabel('Unit Cost').fill('100'); await dialog.getByLabel('Reorder Point').fill('10'); await dialog.getByLabel('Lead Time').fill('5');
 await dialog.getByRole('button',{name:'Save product'}).click(); await expect(dialog).not.toBeVisible();
 await page.getByLabel('Edit TEST-001').click(); await dialog.getByLabel('Product Name').fill('Browser Product Updated'); await dialog.getByRole('button',{name:'Save product'}).click(); await expect(dialog).not.toBeVisible();
 await page.goto('/admin/suppliers-locations'); await page.getByRole('button',{name:'+ Add Supplier',exact:true}).click();
 await dialog.getByLabel('Supplier Name').fill('Browser Supplier'); await dialog.getByLabel('Contact Person').fill('Test Contact');
 await dialog.getByRole('button',{name:'Save supplier'}).click(); await expect(dialog).not.toBeVisible();
 await page.getByLabel('Edit Browser Supplier').click(); await dialog.getByLabel('Contact Person').fill('Updated Contact'); await dialog.getByRole('button',{name:'Save changes'}).click(); await expect(dialog).not.toBeVisible();
 await page.getByLabel('Zone',{exact:true}).fill('Z'); await page.getByLabel('Aisle',{exact:true}).fill('99'); await page.getByLabel('Description',{exact:true}).fill('Browser test zone'); await page.getByRole('button',{name:'Add',exact:true}).click();
 await page.getByLabel('Edit Z-99').click(); await page.getByLabel('Description for Z-99').fill('Updated browser test zone'); await page.getByRole('button',{name:'Save',exact:true}).click(); await expect(page.getByText('Updated browser test zone')).toBeVisible();
 await page.goto('/admin/users'); await page.getByRole('button',{name:'+ Add User',exact:true}).click();
 await dialog.getByLabel('name',{exact:true}).fill('Browser User'); await dialog.getByLabel('email',{exact:true}).fill('browser@example.test'); await dialog.getByLabel('password',{exact:true}).fill('browser-password'); await dialog.getByRole('button',{name:'Create user'}).click(); await expect(dialog).not.toBeVisible();
 await page.getByRole('row').filter({has:page.getByRole('cell',{name:'browser@example.test',exact:true})}).getByRole('button',{name:'Edit'}).click();
 await dialog.getByLabel('Status').selectOption('Inactive'); await dialog.getByRole('button',{name:'Save user'}).click(); await expect(dialog).not.toBeVisible();
 await page.getByRole('link',{name:'View full audit trail'}).click(); await page.waitForURL('**/admin/audit'); await expect(page.getByRole('table')).toContainText('Deactivated user');
 await page.goto('/reports'); await page.getByLabel('Purchase history SKU').selectOption('ACU-014'); await expect(page.getByText('Est.',{exact:true}).first()).toBeVisible();
 await page.evaluate(() => { window.print = () => { document.body.dataset.printed = 'true'; }; }); await page.getByRole('button',{name:'Export as PDF'}).click(); await expect(page.locator('body')).toHaveAttribute('data-printed','true');
});
