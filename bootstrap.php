<?php
/*运行模式*/
# define('APP_MODE', 'pro');
/* 如果你的网站以集群的方式提供服务时，请取消下一行的注释，并配置cluster_config.php */
# define('RUN_IN_CLUSTER', true);
/* 如果你的应用不是运行在网站的根目录,请取消下一行注释并修改其值,必须以/开始,以/结束。*/
# define('WWWROOT_DIR', '/');
/* 如果你的网站对外目录不是wwwroot,请取消下一行注释并修改其值。*/
# define('PUBLIC_DIR', 'wwwroot');
/* 如果你想改变assets目录名，请联消下一行注释并修改其值 */
# define('ASSETS_DIR', 'assets');
/* 如果你想改modules目录名，请取消下一行注释并修改其值. */
# define ('MODULE_DIR', 'modules' );
/* 如果你想改themes目录名，请取消下一行注释并修改其值. */
# define('THEME_DIR', 'themes');
/* 如果你想改extensions目录名，请取消下一行注释并修改其值. */
# define('EXTENSION_DIR', 'extensions');
/* 如果你想改conf目录名，请取消下一行注释并修改其值. */
# define ('CONF_DIR', 'conf' );
/* 如果你想改libs目录名，请取消下一行注释并修改其值. */
# define ('LIBS_DIR', 'includes' );
/* 是否开启gzip压缩 */
# define('GZIP_ENABLED', true);
/* 是否开启防雪崩机制 */
# define('ANTI_AVALANCHE', true);
/* 是否开启防CC机制（访问次数/每多少秒），需要在ccredis_config.php配置redis支持 */
# define('ANTI_CC','10/60');
/* 重新定义运行时内存限制 */
# define ('RUNTIME_MEMORY_LIMIT', '128M' );
// 以上配置选择性修改
// //////////////////////////////////////////////////////////////////////////////
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!以下内容不可修改!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// //////////////////////////////////////////////////////////////////////////////
# define('EXTENSION_LOADER_CLASS', 'wulaphp\app\ExtensionLoader');
define('CONFIG_LOADER_CLASS', 'wula\cms\CmfConfigurationLoader');
define('MODULE_LOADER_CLASS', 'wula\cms\CmfModuleLoader');
define('APPROOT', __DIR__ . DIRECTORY_SEPARATOR);
# define('WULACMF_WEB_INSTALLER', 1);
defined('PUBLIC_DIR') or define('PUBLIC_DIR', 'wwwroot');
if (!defined('WWWROOT')) {
	define('WWWROOT', APPROOT . PUBLIC_DIR . DIRECTORY_SEPARATOR);
}
// 加载composer的autoload.
require APPROOT . 'vendor' . DIRECTORY_SEPARATOR . 'autoload.php';
// end of bootstrap.php