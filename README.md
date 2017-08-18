# oracle-jdk-download-script

A script to download Oracle Java JDK non-interactively using Docker and Chrome headless. 

Requires that docker is inastalled (and also make)

Just run ```make build && make run```

Specify what java version to download via the ```DISTRO_BIN``` environment variable. Default is ```linux-x64.tar.gz```. If you'd like to skip build numbers less or equal to a certain version,  specify environment variable ```JAVA_BUILD_NUMBER_GT=144`.`` The version artifact would be downloaded to your working directory by default, change via the ```DEST``` var.
