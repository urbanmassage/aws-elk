FROM urbanmassage/node:6-slim

WORKDIR /usr/src/app
COPY . /usr/src/app

CMD ["node", "/usr/src/app/index.js"]
