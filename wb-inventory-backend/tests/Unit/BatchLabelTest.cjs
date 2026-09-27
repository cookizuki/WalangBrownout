const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

test('print labels escape all data fields instead of interpreting them as HTML', () => {
    const source = readFileSync(resolve(__dirname, '../../resources/js/Components/BatchLabel.tsx'), 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
    let html = '';
    let closed = false;
    const context = {
        exports: {},
        window: { open: () => ({ document: { write: value => { html = value; }, close: () => { closed = true; } } }) },
    };
    vm.runInNewContext(compiled, context);
    const attack = '<img src=x onerror="alert(1)">&\'';
    context.exports.printBatchLabel({
        productName: attack, sku: attack, batchId: attack, quantity: attack,
        dateReceived: attack, expirationDate: attack,
    });
    const escaped = '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;&#39;';
    assert.equal(html.split(escaped).length - 1, 8);
    assert.equal(html.includes('<img'), false);
    assert.equal(closed, true);
    assert.match(html, /window.onload = \(\) => window.print\(\)/);
});
