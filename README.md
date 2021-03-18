# wulacms

我们努力做一个比较优秀的内容管理框架(CMF)，争取让她像异星战场中的乌拉一样快。

# 依赖

1. PHP >= 7.2
2. MySQL >= 5.6
3. ext-pdo
4. ext-mysqlnd
5. ext-mbstring

# 安装

1. 通过`composer`安装:

   `# composer create-project wula/wulacms`

2. 通过`git`安装：

   `# git clone https://github.com/ninggf/wulacms.git`

   `# composer install`

> 传送至[composer](https://getcomposer.org/).

## 安装内置模块

运行 `php artisan install` 然后根据提示进行配置。

# 运行

> 前提：内置模块成功安装！！！

## 开发模式运行

`php artisan serve`

可选参数: *[[host:]port]*

> 仅用于临时开发。

## fpm + nginx

参见[Nginx 配置](https://www.wulaphp.com/guide/nginx.html)。

## php + httpd

参见[Httpd 配置](https://www.wulaphp.com/guide/httpd.html)。

## docker

> 确保本地的docker服务已经启动且安装了`docker-compose`。

1. 重命名`docker-compose.sample.yml`为`docker-compose.yml`
2. 按需要修改(主要是端口)
3. 运行`docker-compose up -d`命令启动。

> 此文件可以做为`docker-stack.yaml`的模板哦！

## 访问后台

访问`http://your_domain.com[:port]/backend, 输入用户名: admin, 密码: admin，即可登录到后台。

# Docker镜像

## 生成镜像

> 前提: 需要在*nix系统中并安装了make。

1. 打开`Makefile`,修改镜像名`DST_IMG_TAG`。
    * 如果需要生成`service`镜像，请将`HAS_SVC_IMG`改为`1`。
2. 配置版本: `$ export APP_VER=x.x.x`。
3. 然后运行`make build` 即可生成镜像。

## 发布镜像

运行以下命令可以将生成好的镜像发布到镜像仓库:

1. `$ export REG_HOST=your_docker_repository`
2. `$ make install`

## 清空镜像

`make clean`
