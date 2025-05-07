FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

COPY backend/ ./backend/

ENV PORT=5010
EXPOSE ${PORT}

ENV NODE_ENV=production

CMD ["node", "backend/server.js"]