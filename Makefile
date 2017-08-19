DEST ?= ${PWD}
REPO ?= reembs/oracle-java-jdk-downloader
TAG ?= latest

build:
	docker build --pull -t ${REPO}:${TAG} .

run:
	docker run --cap-add=SYS_ADMIN --init --shm-size=1024m \
	-v ${DEST}:/vol \
	-e DOWNLOAD_PAGE \
	-e DISTRO_BIN \
	-e CHECKSUM_PAGE \
	-e VOLUME \
	-e JAVA_MAJOR_VERSION \
	-e JAVA_BUILD_NUMBER_GT \
	-e TERMS_TEXT_HASH \
	-ti ${REPO}:${TAG} node jd.js
