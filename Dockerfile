FROM node:20-bullseye-slim

WORKDIR /app

COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

RUN cd backend && npm install
RUN cd frontend && npm install

COPY . .

RUN cd backend && npx prisma generate
RUN cd frontend && npm run build

EXPOSE 3000 5173

CMD ["sh", "-c", "cd backend && npx tsx src/app.ts"]
