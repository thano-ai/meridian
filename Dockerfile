FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY backend/package.json backend/package-lock.json* ./backend/
RUN cd backend && npm install --omit=dev

COPY frontend/package.json frontend/package-lock.json* ./frontend/
RUN cd frontend && npm install

COPY backend ./backend
COPY frontend ./frontend
COPY data ./data
COPY config ./config
COPY backup ./backup

RUN cd frontend && npm run build
RUN cd backend && node database/seed.js

WORKDIR /app/backend
EXPOSE 4721
CMD ["node", "server.js"]
