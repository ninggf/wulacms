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
    'debug'    => env('app.debug.level', 'warn'),
    'resource' => [
        'combinate' => env('resource.combinate', 0),
        'minify'    => env('resource.minify', 0)
    ],
    'uploader' => [
        'local'    => [
            'name' => 'Local',
            'ref'  => '#default',
            //'-watermark' => 1,
        ],
        '#default' => [
            'url'       => '/',
            'name'      => 'Local Filesystem',
            'uploader'  => '\wulaphp\io\LocaleUploader',
            'allowed'   => explode(',', 'jpg,gif,png,bmp,jpeg,zip,rar,7z,tar,gz,bz2,doc,docx,txt,ppt,pptx,xls,xlsx,pdf,mp3,avi,mp4,flv,swf'),
            'watermark' => [],
            'setup'     => [
                'dest' => 'files'
            ],
            'maxSize'   => 10000000
        ]
    ],
    'modules'  => ['system']
];