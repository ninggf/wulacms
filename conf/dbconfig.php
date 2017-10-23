<?php
/**
 * 数据库配置。
 */
$config = new \wulaphp\conf\DatabaseConfiguration('default');
$config->driver(env('db.driver', 'MySQL'));
$config->host(env('db.host', '{db.host}'));
$config->port(env('db.port', '{db.port}'));
$config->dbname(env('db.name', '{db.name}'));
$config->encoding(env('db.charset', '{db.charset}'));
$config->user(env('db.user', '{db.user}'));
$config->password(env('db.password', '{db.password}'));
$options = env('db.options', '');
if ($options) {
	$options = explode(',', $options);
	$dbops   = [];
	foreach ($options as $option) {
		$ops = explode('=', $option);
		if (count($ops) == 2) {
			if ($ops[1][0] == 'P') {
				$dbops[ @constant($ops[0]) ] = @constant($ops[1]);
			} else {
				$dbops[ @constant($ops[0]) ] = intval($ops[1]);
			}
		}
	}
	$config->options($dbops);
}

return $config;