FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3002

CMD ["sh", "-c", "node database/setup_local.js && exec node app.js"]
