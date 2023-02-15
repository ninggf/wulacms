DST_IMG_TAG   = wulacms
TEST_SVC_NAME = test
app_files     = conf crontab extensions modules themes vendor wwwroot artisan bootstrap.php
DOC_RUN       = docker-compose -f tests/docker-compose.yml

build:app

app:tar
	docker build --build-arg WXZ_APP_VER="${WXZ_APP_VER}" -t "${DST_IMG_TAG}:${WXZ_APP_VER}-app" -f docker/Dockerfile docker/
	docker build --build-arg WXZ_APP_VER="${WXZ_APP_VER}" -t "${DST_IMG_TAG}:${WXZ_APP_VER}-svc" -f docker/service.Dockerfile docker/

tag:build
	@if [ -z "$${REG_HOST}"  ]; then \
		echo 'error: REG_HOST is not exported for registry host!';\
		echo 'please run "export REG_HOST=xx.xx.xx.xx" first!';\
		exit 1;\
	fi
	docker tag "${DST_IMG_TAG}:${WXZ_APP_VER}-app" "${REG_HOST}/${DST_IMG_TAG}:${WXZ_APP_VER}-app"
	docker tag "${DST_IMG_TAG}:${WXZ_APP_VER}-svc" "${REG_HOST}/${DST_IMG_TAG}:${WXZ_APP_VER}-svc"

tar:clean
	@if [ -z "$${WXZ_APP_VER}"  ]; then \
  		echo 'error: WXZ_APP_VER is not exported for wxz app version!';\
  		echo 'please run "export WXZ_APP_VER=xx.xx.xx" first!';\
		exit 1;\
 	fi
	tar -cjf "docker/wxz-${WXZ_APP_VER}.tar.bz2" --exclude='.vscode' --exclude='.gi*' --exclude='.DS_Store' ${app_files}

install:tag
	docker push "${REG_HOST}/${DST_IMG_TAG}:${WXZ_APP_VER}-app"
	docker push "${REG_HOST}/${DST_IMG_TAG}:${WXZ_APP_VER}-svc"

installer:tar
	docker build --build-arg WXZ_APP_VER="${WXZ_APP_VER}" -t "wxz:installer" -f docker/install.Dockerfile docker/

test: cleantest
	$(DOC_RUN) up -d
	$(DOC_RUN) exec ${TEST_SVC_NAME} sh ./tests/run_docker_test.sh || echo 'Could not pass the unit test!'
	$(DOC_RUN) down

clean:
	@echo "delete all bz2 files..."
	rm -f docker/*.tar.bz2
	@echo "rm old images..."
	for img in $$(docker images | grep ${DST_IMG_TAG} | awk 'BEGIN {OFS=":"} {print $$1,$$2}'); do docker rmi $$img;done
	@echo "clean done!"

cleantest:
	$(DOC_RUN) down
