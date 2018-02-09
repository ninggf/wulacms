#!/usr/bin/env php
<?php
/**
 * CRONTAB SCRIPT.
 */
require __DIR__ . '/../bootstrap.php';
fire('crontab_hour', date('H'));
//that's all.