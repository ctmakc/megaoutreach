# 🤖 Автоматический Git Commit и Push

Настройка автоматического коммита каждый час.

---

## Вариант 1: Windows Task Scheduler (Рекомендую для Windows)

### Шаг 1: Настрой Task Scheduler

1. Открой **Task Scheduler** (Планировщик заданий)
2. Нажми **Create Basic Task** (Создать простую задачу)
3. Имя: `Auto Git Commit`
4. Trigger: **Daily** (Ежедневно)
5. Start: выбери сегодня, время любое
6. Action: **Start a program**
7. Program/script: `powershell.exe`
8. Arguments: `-ExecutionPolicy Bypass -File "C:\Users\ctmak\OneDrive\Рабочий стол\PYTHON\megaoutreach\megaoutreach\auto-commit.ps1"`
9. Start in: `C:\Users\ctmak\OneDrive\Рабочий стол\PYTHON\megaoutreach\megaoutreach`

### Шаг 2: Настрой повторение каждый час

1. Найди созданную задачу в Task Scheduler Library
2. Правый клик → **Properties**
3. Вкладка **Triggers** → Edit
4. Поставь галку **Repeat task every:** → выбери **1 hour**
5. Duration: **Indefinitely** (бесконечно)
6. OK

✅ Готово! Теперь каждый час будет автокоммит.

---

## Вариант 2: Node.js процесс (работает всегда)

### Запуск:

```bash
node auto-commit.js
```

Или добавь в `package.json`:

```json
{
  "scripts": {
    "auto-commit": "node auto-commit.js"
  }
}
```

Запуск:
```bash
npm run auto-commit
```

### Чтобы работало в фоне (Windows):

Создай файл `start-auto-commit.vbs`:

```vbs
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c cd /d C:\Users\ctmak\OneDrive\Рабочий стол\PYTHON\megaoutreach\megaoutreach && node auto-commit.js", 0, False
```

Добавь этот `.vbs` файл в автозагрузку Windows:
- Нажми `Win + R`
- Введи `shell:startup`
- Скопируй туда `start-auto-commit.vbs`

✅ Теперь при запуске Windows автокоммит будет работать в фоне!

---

## Вариант 3: Linux/Mac (через cron)

### Шаг 1: Сделай скрипт исполняемым

```bash
chmod +x auto-commit.sh
```

### Шаг 2: Открой crontab

```bash
crontab -e
```

### Шаг 3: Добавь строку (каждый час)

```bash
0 * * * * cd /path/to/megaoutreach && ./auto-commit.sh >> /tmp/auto-commit.log 2>&1
```

Сохрани и закрой.

✅ Готово!

---

## Вариант 4: Docker-контейнер (для продакшена)

Если хочешь, чтобы автокоммит работал на сервере, добавь в `docker-compose.yml`:

```yaml
services:
  auto-commit:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - .:/app
    command: node auto-commit.js
    restart: unless-stopped
```

---

## Проверка работы

### Вручную запусти любой скрипт:

**Windows:**
```powershell
powershell -ExecutionPolicy Bypass -File auto-commit.ps1
```

**Linux/Mac:**
```bash
./auto-commit.sh
```

**Node.js:**
```bash
node auto-commit.js
```

---

## Логи

### Windows Task Scheduler:
- Посмотри историю в Task Scheduler → History

### Node.js:
- Логи будут в консоли

### Linux cron:
- Логи в `/tmp/auto-commit.log`

---

## Отключение

### Windows:
- Task Scheduler → Найди задачу → Disable или Delete

### Node.js:
- Просто останови процесс (Ctrl+C)

### Linux/Mac:
```bash
crontab -e
# Удали или закомментируй строку
```

---

## Что делает скрипт?

1. Проверяет, есть ли изменения (`git status`)
2. Если есть → добавляет все файлы (`git add -A`)
3. Коммитит с временной меткой (`git commit -m "auto: 2024-01-12 15:30:00"`)
4. Пушит в main (`git push origin main`)
5. Если нет изменений → ничего не делает

---

## Советы

- 🔒 Убедись, что настроен SSH ключ для Git (чтобы не вводить пароль)
- 📝 Логи помогут отследить проблемы
- ⏰ Можешь изменить интервал (например, каждые 30 минут: `1800000` в Node.js)
- 🚫 Добавь в `.gitignore` файлы, которые не нужно коммитить

---

## Настройка SSH ключа (чтобы не вводить пароль)

```bash
# Генерируй ключ
ssh-keygen -t ed25519 -C "your_email@example.com"

# Добавь в ssh-agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Скопируй публичный ключ
cat ~/.ssh/id_ed25519.pub

# Добавь в GitHub: Settings → SSH and GPG keys → New SSH key
```

Измени remote на SSH:
```bash
git remote set-url origin git@github.com:username/megaoutreach.git
```

✅ Теперь пуш будет без пароля!
