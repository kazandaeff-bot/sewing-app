#!/bin/bash
# ============================================================
# Скрипт деплоя sewing-production-platform на VPS
# Запуск: bash deploy-vps.sh
# ============================================================

set -e

PROJECT_DIR="/root/sewing-production-platform"
DUMP_FILE="project-dump-fixed.txt"
DB_DIR="$PROJECT_DIR/db"
ENV_FILE="$PROJECT_DIR/.env"

echo "=== Швейное Производство — Деплой на VPS ==="
echo ""

# 1. Проверяем наличие дампа
if [ ! -f "$DUMP_FILE" ]; then
    echo "❌ Файл $DUMP_FILE не найден в текущей директории!"
    echo "   Скопируйте project-dump-fixed.txt в эту директорию и запустите снова."
    exit 1
fi

# 2. Создаём директорию проекта
echo "📁 Создаём директорию проекта..."
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

# 3. Останавливаем старый процесс (если запущен)
echo "🛑 Останавливаем старый процесс (если запущен)..."
pkill -f "node.*server.js" 2>/dev/null || true
pkill -f "bun.*server.js" 2>/dev/null || true
sleep 2

# 4. Парсим дамп и восстанавливаем файлы
echo "📦 Восстанавливаем файлы из дампа..."
python3 -c "
import os, sys

dump_file = '$DUMP_FILE'
if not os.path.isabs(dump_file):
    dump_file = os.path.join(os.getcwd(), dump_file)

with open(dump_file, 'r', encoding='utf-8') as f:
    content = f.read()

files = content.split('=== FILE: ')
count = 0
for block in files[1:]:  # skip header before first marker
    # Skip if this came from a comment line (e.g. "# Format: ... === FILE: path ===")
    first_line = block.split('\n', 1)[0].strip()
    if ' and ' in first_line or first_line.startswith('#'):
        continue
    end_marker = '=== END FILE ==='
    if end_marker not in block:
        continue
    filepath_and_content = block.split(end_marker)[0]
    lines = filepath_and_content.split('\n', 1)
    filepath = lines[0].strip().rstrip(' =').replace(' ===', '')
    file_content = lines[1] if len(lines) > 1 else ''
    
    # Remove trailing newline added by split
    if file_content.endswith('\n'):
        file_content = file_content[:-1]
    
    full_path = os.path.join('$PROJECT_DIR', filepath)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, 'w', encoding='utf-8') as out:
        out.write(file_content)
    count += 1

print(f'Восстановлено файлов: {count}')
"

# 5. Создаём .env с АБСОЛЮТНЫМ путём к БД
echo "⚙️  Создаём .env с абсолютным путём к базе данных..."
mkdir -p "$DB_DIR"
cat > "$ENV_FILE" << EOF
DATABASE_URL=file:$DB_DIR/custom.db
NEXTAUTH_SECRET=sewing-platform-secret-key-2026
NEXTAUTH_URL=http://47.57.242.119:81
EOF

# 6. Устанавливаем зависимости
echo "📥 Устанавливаем зависимости..."
cd "$PROJECT_DIR"
npm install 2>&1 | tail -5

# 7. Генерируем Prisma клиент
echo "🔧 Генерируем Prisma клиент..."
npx prisma generate

# 8. Создаём/обновляем базу данных
echo "🗄️  Создаём базу данных..."
mkdir -p "$DB_DIR"
DATABASE_URL="file:$DB_DIR/custom.db" npx prisma db push

# 9. Билдим проект
echo "🏗️  Билдим проект..."
npm run build 2>&1 | tail -10

# 10. Копируем статику и public в standalone
echo "📋 Копируем статику и public в standalone..."
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/

# 11. Запускаем сервер
echo "🚀 Запускаем сервер..."
cd "$PROJECT_DIR"
DATABASE_URL="file:$DB_DIR/custom.db" PORT=3000 nohup node .next/standalone/server.js > server.log 2>&1 &
SERVER_PID=$!
sleep 5

# 12. Сидируем базу (после запуска сервера!)
echo "🌱 Наполняем базу данных..."
curl -s http://localhost:3000/api/seed

# 13. Проверяем запуск
echo ""
echo "=== Проверка ==="
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null || echo "000")
API_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/products 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Страница: HTTP $HTTP_CODE"
else
    echo "❌ Страница: HTTP $HTTP_CODE"
    echo "   Проверьте лог: cat $PROJECT_DIR/server.log"
fi

if [ "$API_CODE" = "200" ]; then
    echo "✅ API: HTTP $API_CODE"
else
    echo "❌ API: HTTP $API_CODE"
    echo "   Проверьте лог: cat $PROJECT_DIR/server.log"
fi

echo ""
echo "PID сервера: $SERVER_PID"
echo "Лог: $PROJECT_DIR/server.log"
echo "Приложение: http://47.57.242.119:81"
echo ""
echo "=== Завершено ==="
