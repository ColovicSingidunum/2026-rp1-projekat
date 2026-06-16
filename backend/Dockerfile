# backend (Node + Express)
FROM node:20-alpine

WORKDIR /app

# instaliranje zavisnosti (kesiranje)
COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "src/index.js"]
