$env:APP_ENV = 'testing'
$env:APP_CONFIG_CACHE = Join-Path (Get-Location) 'storage/framework/testing/browser-config.php'
$env:DB_CONNECTION = 'sqlite'
$env:DB_DATABASE = Join-Path (Get-Location) 'storage/framework/testing/dashboard-browser.sqlite'
$env:SESSION_DRIVER = 'file'
$env:CACHE_STORE = 'array'
$env:QUEUE_CONNECTION = 'sync'
$env:APP_URL = 'http://127.0.0.1:8011'
Set-Location public
php -d extension=pdo_sqlite -d extension=sqlite3 -S 127.0.0.1:8011 ../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php
