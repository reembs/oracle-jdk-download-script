FROM yukinying/chrome-headless-browser

WORKDIR /
USER root
RUN apt-get update && apt-get install -y curl && curl -sL https://deb.nodesource.com/setup_8.x | bash - && apt-get install -y nodejs

RUN mkdir /app && chown headless:headless /app
USER headless
WORKDIR /app
RUN npm i puppeteer
COPY *.js /app/

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
