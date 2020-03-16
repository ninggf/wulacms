<?php
/*
 * 配置默认安装的模块
 * This file is part of wulacms.
 *
 * (c) Leo Ning <windywany@gmail.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
return [
    'debug'    => env('debug', DEBUG_WARN),
    'alias'    => ['{alias}'],
    'resource' => [
        'combinate' => env('resource.combinate', 0),
        'minify'    => env('resource.minify', 0)
    ],
    'modules'  => []
];