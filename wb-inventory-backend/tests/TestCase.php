<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    public function createApplication()
    {
        $app = parent::createApplication();
        if ($app['config']->get('database.default') === 'mysql' && $app['config']->get('database.connections.mysql.database') !== 'wb_inventory_test') {
            throw new \RuntimeException('MySQL tests may only use the isolated wb_inventory_test database.');
        }

        return $app;
    }
}
