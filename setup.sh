#!/bin/bash
# Автоматизиран setup скрипт за Recipe App
# Използвай: bash setup.sh

set -e  # Спира при грешка

echo "════════════════════════════════════════════════════════"
echo "  📖 Recipe App - Автоматична инсталация"
echo "════════════════════════════════════════════════════════"
echo ""

# Проверка дали сме в правилната директория
if [ ! -f "app.py" ]; then
    echo "❌ ГРЕШКА: Моля стартирайте скрипта от директорията recipe_app/"
    echo "   cd /home/pi/recipe_app"
    echo "   bash setup.sh"
    exit 1
fi

# Стъпка 1: Проверка за python3
echo "🔍 Проверка за Python 3..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 не е намерен. Инсталирайте го първо:"
    echo "   sudo apt-get update"
    echo "   sudo apt-get install python3 python3-venv python3-pip"
    exit 1
fi
echo "✅ Python 3 намерен: $(python3 --version)"
echo ""

# Стъпка 2: Създаване на virtual environment
if [ -d "venv" ]; then
    echo "⚠️  Virtual environment вече съществува."
    read -p "   Искате ли да го пресъздадете? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  Изтриване на стар venv..."
        rm -rf venv
    else
        echo "📦 Използване на съществуващ venv..."
    fi
fi

if [ ! -d "venv" ]; then
    echo "📦 Създаване на virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment създаден"
fi
echo ""

# Стъпка 3: Активиране на venv и инсталация на зависимости
echo "📥 Инсталация на Python зависимости..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
echo "✅ Зависимостите са инсталирани"
echo ""

# Стъпка 4: Инициализация на базата данни
if [ -f "recipes.db" ]; then
    echo "⚠️  База данни вече съществува."
    read -p "   Искате ли да добавите примерни рецепти? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📚 Добавяне на примерни рецепти..."
        python add_sample_recipes.py
    else
        echo "⏭️  Пропускане на примерните рецепти..."
    fi
else
    echo "📚 Създаване на база данни с примерни рецепти..."
    python add_sample_recipes.py
    echo "✅ Базата данни е създадена"
fi
echo ""

# Стъпка 5: Намиране на IP адрес
echo "🌐 Мрежова информация:"
IP_ADDRESS=$(hostname -I | awk '{print $1}')
echo "   Локално IP: $IP_ADDRESS"
echo "   Порт: 5002"
echo ""

# Стъпка 6: Systemd service конфигурация
echo "🔧 Systemd service конфигурация:"
if [ -f "/etc/systemd/system/recipe_app.service" ]; then
    echo "   ✅ Service файлът вече е инсталиран"
else
    echo "   ⚠️  Service файлът не е инсталиран"
    read -p "   Искате ли да го инсталирате сега? (изисква sudo) (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "   📋 Копиране на service файл..."
        sudo cp recipe_app.service /etc/systemd/system/
        sudo systemctl daemon-reload
        
        read -p "   Искате ли да активирате автоматично стартиране? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo systemctl enable recipe_app
            echo "   ✅ Автоматично стартиране активирано"
        fi
        
        read -p "   Искате ли да стартирате сега? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo systemctl start recipe_app
            echo "   ✅ Услугата е стартирана"
            sleep 2
            sudo systemctl status recipe_app --no-pager
        fi
    fi
fi
echo ""

# Стъпка 7: Финални инструкции
echo "════════════════════════════════════════════════════════"
echo "  ✅ Инсталацията приключи успешно!"
echo "════════════════════════════════════════════════════════"
echo ""
echo "📱 Достъп до приложението:"
echo "   Главна страница: http://$IP_ADDRESS:5002"
echo "   Админ панел:      http://$IP_ADDRESS:5002/admin"
echo ""
echo "🔧 Управление на услугата (systemd):"
echo "   Стартиране:    sudo systemctl start recipe_app"
echo "   Спиране:       sudo systemctl stop recipe_app"
echo "   Рестартиране:  sudo systemctl restart recipe_app"
echo "   Статус:        sudo systemctl status recipe_app"
echo "   Логове:        sudo journalctl -u recipe_app -f"
echo ""
echo "🧪 Тестово стартиране (без systemd):"
echo "   source venv/bin/activate"
echo "   python app.py"
echo ""
echo "📚 Документация:"
echo "   README.md        - Пълна документация"
echo "   INSTALL.md       - Инсталационни инструкции"
echo "   PROJECT_OVERVIEW.md - Обобщение на проекта"
echo ""
echo "🎉 Готово! Приятно готвене!"
echo ""

deactivate 2>/dev/null || true
