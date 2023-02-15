FROM wulaphp/php:7.4.10-ng-alphine

ARG WXZ_APP_VER

ENV WXZ_APP_VER=$WXZ_APP_VER

ADD wxz-$WXZ_APP_VER.tar.bz2 /var/www/html/

RUN cd /var/www/html && mkdir -p storage/logs && mkdir -p storage/tmp &&\
    chown -R www-data:www-data storage conf &&\
    rm -f conf/install.lock conf/config.php conf/dbconfig.php;\
    [ -e conf/.env ] && rm conf/.env || echo '.env not found'

COPY etc/ /usr/local/etc/