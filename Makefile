DEST ?= ${PWD}

build:
	docker build . -t java_downloader_image

run:
	docker run --cap-add=SYS_ADMIN --init --shm-size=1024m \
	-v ${DEST}:/vol \
	-e DOWNLOAD_PAGE \
	-e DISTRO_BIN \
	-e CHECKSUM_PAGE \
	-e VOLUME \
	-e JAVA_MAJOR_VERSION \
	-e JAVA_BUILD_NUMBER_GT \
	-ti java_downloader_image node jd.js
