FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
ENV PORT=3333
ENV DATA_DIR=/app/data
EXPOSE 3333
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:$PORT/health || exit 1
CMD ["node", "server.js"]
