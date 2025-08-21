FROM node:22-alpine

WORKDIR /app

# Копирование package.json и package-lock.json
COPY package*.json ./

# Установка всех зависимостей (включая devDependencies для сборки)
RUN npm ci

# Копирование исходного кода
COPY . .

# Сборка приложения
RUN npm run build

# Удаление devDependencies после сборки (опционально)
RUN npm prune --production

# Открытие порта
EXPOSE 3000

# Запуск приложения
CMD ["npm", "run", "start:prod"]