const { execFileSync } = require('node:child_process');
const { mkdirSync, existsSync, writeFileSync } = require('node:fs');
const path = require('node:path');
module.exports = async () => {
 const file = path.resolve('storage/framework/testing/dashboard-browser.sqlite');
 if (!file.startsWith(path.resolve('storage/framework/testing') + path.sep)) throw new Error('Unsafe test database path');
 mkdirSync(path.dirname(file), { recursive: true });
 if (!existsSync(file)) writeFileSync(file, '');
 execFileSync('php', ['-d','extension=pdo_sqlite','-d','extension=sqlite3','artisan','migrate:fresh','--seed','--force','--no-interaction'], { env: { ...process.env, APP_ENV:'testing', APP_CONFIG_CACHE:path.resolve('storage/framework/testing/browser-config.php'), DB_CONNECTION:'sqlite', DB_DATABASE:file, SESSION_DRIVER:'file', CACHE_STORE:'array', QUEUE_CONNECTION:'sync' }, stdio: 'pipe' });
};
