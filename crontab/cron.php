#!/usr/bin/env php
<?php
/**
 * CRONTAB SCRIPT.
 */
require __DIR__ . '/../bootstrap.php';

try {
    fire('crontab', time());
} catch (Exception $e) {
    log_warn($e->getMessage(), 'crontab');
}
//that's all.