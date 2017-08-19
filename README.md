# oracle-jdk-download-script

[![Build Status](https://travis-ci.org/reembs/oracle-jdk-download-script.svg?branch=master)](https://travis-ci.org/travis-ci.org/reembs/oracle-jdk-download-script)

A script to download Oracle Java JDK non-interactively using Docker and Chrome headless. 

Requires that docker is inastalled (and also make)

Just clone the code and run ```make build && make run```

To run without cloning:
```bash
	docker run --cap-add=SYS_ADMIN --init --shm-size=1024m \
	  -v ${PWD}:/vol \
	  -e DISTRO_BIN \
	  -e JAVA_MAJOR_VERSION \
	  -e JAVA_BUILD_NUMBER_GT \
	  -ti reembs/oracle-java-jdk-downloader
```

Specify what java binary format to download via the ```DISTRO_BIN``` environment variable. Default is ```linux-x64.tar.gz```. If you'd like to skip build numbers less or equal to a certain version,  specify environment variable ```JAVA_BUILD_NUMBER_GT=144```. The version artifact would be downloaded to your working directory by default, change via the ```DEST``` var.

The script will also validate the binary checksum and will verify that you're aware of terms changes and approve them.

This project was built using:

[Headless Chrome](https://chromium.googlesource.com/chromium/src/+/lkgr/headless/README.md)

[Puppeteer](https://github.com/GoogleChrome/puppeteer)

[chrome-headless-browser-docker](https://github.com/yukinying/chrome-headless-browser-docker)
