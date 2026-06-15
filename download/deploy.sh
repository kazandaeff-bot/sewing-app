#!/bin/bash
# =============================================================
# Скрипт автоматического деплоя Sewing Management App
# Для запуска на сервере TimeWeb (Ubuntu)
# =============================================================
set -e

APP_DIR="/opt/sewing-app"
DB_DIR="$APP_DIR/db"
ENV_FILE="$APP_DIR/.env"
NODE_VERSION="20"

echo "============================================"
echo "  Sewing App — Автоматический деплой"
echo "============================================"

# 1. Обновление системы
echo ""
echo "[1/8] Обновление системы..."
apt-get update -yqq

# 2. Установка Node.js 20
echo ""
echo "[2/8] Установка Node.js $NODE_VERSION..."
if ! command -v node &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_$NODE_VERSION.x | bash -
    apt-get install -y nodejs
fi
echo "Node.js: $(node -v)"
echo "npm: $(npm -v)"

# 3. Установка pm2 (менеджер процессов)
echo ""
echo "[3/8] Установка pm2..."
if ! command -v pm2 &>/dev/null; then
    npm install -g pm2
fi
echo "pm2: $(pm2 -v)"

# 4. Создание директории приложения
echo ""
echo "[4/8] Подготовка директории $APP_DIR..."
mkdir -p "$APP_DIR"
mkdir -p "$DB_DIR"

# 5. Распаковка проекта (если архив есть в /root или /tmp)
echo ""
echo "[5/8] Поиск архива проекта..."
ARCHIVE=""
for path in /root/sewing-app-deploy.tar.gz /tmp/sewing-app-deploy.tar.gz; do
    if [ -f "$path" ]; then
        ARCHIVE="$path"
        break
    fi
done

if [ -n "$ARCHIVE" ]; then
    echo "Найден архив: $ARCHIVE"
    tar xzf "$ARCHIVE" -C "$APP_DIR"
    echo "Проект распакован в $APP_DIR"
else
    echo "Архив НЕ найден!"
    echo "Скопируйте sewing-app-deploy.tar.gz на сервер и перезапустите скрипт."
    echo "  scp sewing-app-deploy.tar.gz root@СЕРВЕР:/root/"
    echo ""
    echo "Или распакуйте проект вручную в $APP_DIR и запустите скрипт с --skip-archive"
    if [ "$1" != "--skip-archive" ]; then
        exit 1
    fi
    echo "Пропуск распаковки (--skip-archive)..."
fi

# 6. Настройка .env
echo ""
echo "[6/8] Настройка .env..."
if [ ! -f "$ENV_FILE" ] || ! grep -q "JWT_SECRET" "$ENV_FILE"; then
    cat > "$ENV_FILE" << 'ENVEOF'
DATABASE_URL=file:/opt/sewing-app/db/custom.db
JWT_SECRET=sewing-prod-2024-kj7Hx9mP3vRz5wBq8nL2sY4dT6fA0cE
ENVEOF
    echo ".env создан с JWT_SECRET"
else
    echo ".env уже существует с JWT_SECRET"
fi

# Обновляем DATABASE_URL на новый путь
sed -i "s|DATABASE_URL=.*|DATABASE_URL=file:$DB_DIR/custom.db|" "$ENV_FILE"

# 7. Установка зависимостей и сборка
echo ""
echo "[7/8] Установка зависимостей и сборка..."
cd "$APP_DIR"

npm install --production=false

# Генерация Prisma клиента
npx prisma generate

# Если базы нет — создаём
if [ ! -f "$DB_DIR/custom.db" ]; then
    echo "Создание базы данных..."
    # Временно меняем DATABASE_URL для миграции
    export DATABASE_URL="file:$DB_DIR/custom.db"
    npx prisma db push
    echo "База данных создана"
else
    echo "База данных уже существует"
fi

# Сборка Next.js
echo "Сборка Next.js (может занять несколько минут)..."
npm run build

# 8. Запуск через pm2
echo ""
echo "[8/8] Запуск приложения через pm2..."
cd "$APP_DIR"

# Остановить предыдущий инстанс если есть
pm2 delete sewing-app 2>/dev/null || true

# Запуск standalone сервера
pm2 start .next/standalone/server.js \
    --name sewing-app \
    --node-args="--max-old-space-size=512" \
    --env NODE_ENV=production \
    --env JWT_SECRET=sewing-prod-2024-kj7Hx9mP3vRz5wBq8nL2sY4dT6fA0cE \
    --env DATABASE_URL="file:$DB_DIR/custom.db" \
    --env HOSTNAME=0.0.0.0 \
    --env PORT=3000

# Сохранить конфигурацию pm2 для автозапуска
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

echo ""
echo "============================================"
echo "  Деплой завершён!"
echo "============================================"
echo ""
echo "Приложение доступно: http://45.91.238.90:3000"
echo ""
echo "Полезные команды:"
echo "  pm2 status          — статус приложения"
echo "  pm2 logs sewing-app — логи приложения"
echo "  pm2 restart sewing-app — перезапуск"
echo "  pm2 stop sewing-app    — остановка"
echo ""
