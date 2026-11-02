---
name: github-deploy
description: >-
  Универсальный навык для публикации, коммита и отправки (push) проектов на GitHub в этой системе.
  Используйте этот навык всякий раз, когда пользователь просит выложить проект на GitHub, создать или
  подключить репозиторий, задеплоить сайт на GitHub Pages или синхронизировать изменения, используя
  уже сохранённый и авторизованный токен GitHub в Windows Credential Manager.
---

# Навык: Публикация и деплой на GitHub (`github-deploy`)

Этот навык описывает проверенный и полностью рабочий регламент выгрузки любого проекта на GitHub на текущей рабочей машине пользователя без повторных запросов паролей и токенов.

---

## 1. Контекст авторизации и окружения (Критически важно!)

На этой машине уже настроена бесшовная авторизация:
- **Пользователь GitHub:** `psychomanya`
- **Email:** `psychomanya@users.noreply.github.com`
- **Хранилище токена:** Windows Credential Manager (`wincred`), цель `git:https://github.com` и `git:https://psychomanya@github.com`.
- **Расположение Git:** `C:\Users\marym\AppData\Local\Programs\Git\cmd\git.exe` (добавлен в системный PATH).
- **ВНИМАНИЕ: Ошибка 407 (CONNECT tunnel failed):**
  В сессиях агента Antigravity системные переменные `$env:HTTP_PROXY` и `$env:HTTPS_PROXY` могут указывать на локальный loopback-прокси (`127.0.0.1`), который блокирует запросы к `github.com` с ошибкой `HTTP 407 Proxy Authentication Required`.
  
  **ОБЯЗАТЕЛЬНОЕ ПРАВИЛО:** Любая команда `git push`, `git pull`, `git fetch`, `git ls-remote` или `git clone` ДОЛЖНА запускаться с обходом этого прокси:
  ```powershell
  $env:NO_PROXY = "github.com,*.github.com,api.github.com,localhost,127.0.0.1"; $env:HTTP_PROXY = ""; $env:HTTPS_PROXY = ""; git <команда>
  ```

---

## 2. Пошаговый сценарий выкладки проекта

### Шаг 1. Проверка окружения и статуса Git
Перед выполнением любых действий убедитесь, что Git доступен и репозиторий инициализирован:

```powershell
# 1. Обеспечить доступ к git и обход прокси
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    $env:PATH = "C:\Users\marym\AppData\Local\Programs\Git\cmd;$env:PATH"
}
$env:NO_PROXY = "github.com,*.github.com,api.github.com,localhost,127.0.0.1"
$env:HTTP_PROXY = ""
$env:HTTPS_PROXY = ""

# 2. Проверить, инициализирован ли репозиторий
git status
```

Если репозиторий ещё не инициализирован (`fatal: not a git repository`):
```powershell
git init -b main
git config user.name "psychomanya"
git config user.email "psychomanya@users.noreply.github.com"
```

### Шаг 2. Проверка `.gitignore`
Убедитесь, что в репозиторий не попадут лишние тяжёлые папки и секреты:
- `node_modules/`
- `.env`, `.env.local`
- `.gemini/`
- `dist/` (если для сборки используется GitHub Actions)

Если файла `.gitignore` нет, создайте его перед добавлением файлов.

### Шаг 3. Индексация и коммит
```powershell
git add .
git commit -m "feat: <осмысленное описание изменений>"
```

### Шаг 4. Подключение удалённого репозитория (Remote)
Проверьте текущий `origin`:
```powershell
git remote -v
```

- **Если remote уже настроен:** убедитесь, что он указывает на репозиторий пользователя:
  `https://github.com/psychomanya/<repo-name>.git`
- **Если remote отсутствует:**
  ```powershell
  git remote add origin https://github.com/psychomanya/<имя_репозитория>.git
  ```

*(Если репозиторий на GitHub ещё не создан, пользователь может создать его в 1 клик на https://github.com/new с именем `<имя_репозитория>`, не инициализируя README).*

### Шаг 5. Отправка изменений (Push) с использованием авторизованного токена
Выполните `push` с гарантированным обходом локального прокси:

```powershell
$env:NO_PROXY = "github.com,*.github.com,api.github.com,localhost,127.0.0.1"
$env:HTTP_PROXY = ""
$env:HTTPS_PROXY = ""
git push -u origin main
```
> **Результат:** Git автоматически обратится к Windows Credential Manager (`wincred`), извлечёт авторизованный токен `psychomanya` и выполнит быструю отправку без ввода логинов и паролей.

---

## 3. Настройка бесплатного хостинга GitHub Pages (для веб-приложений)

Если проект представляет собой Single Page Application (SPA на Vite/React/Vue/HTML):

1. **Базовый путь в `vite.config.js`:**
   В `vite.config.js` укажите базовый путь, соответствующий имени репозитория:
   ```javascript
   export default defineConfig({
     base: '/<имя_репозитория>/', // Например: '/mountains/'
     plugins: [react()],
   })
   ```

2. **Рабочий процесс GitHub Actions (`.github/workflows/deploy.yml`):**
   ```yaml
   name: Deploy to GitHub Pages

   on:
     push:
       branches: [ main ]
     workflow_dispatch:

   permissions:
     contents: read
     pages: write
     id-token: write

   concurrency:
     group: 'pages'
     cancel-in-progress: true

   jobs:
     deploy:
       environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
       runs-on: ubuntu-latest
       steps:
         - name: Checkout
           uses: actions/checkout@v4

         - name: Setup Node
           uses: actions/setup-node@v4
           with:
             node-version: 20
             cache: 'npm'

         - name: Install dependencies
           run: npm ci

         - name: Build
           run: npm run build

         - name: Setup Pages
           uses: actions/configure-pages@v4

         - name: Upload artifact
           uses: actions/upload-pages-artifact@v3
           with:
             path: './dist'

         - name: Deploy to GitHub Pages
           id: deployment
           uses: actions/deploy-pages@v4
   ```

3. **Включение в репозитории:**
   На странице репозитория `https://github.com/psychomanya/<имя_репозитория>/settings/pages`:
   В блоке **Build and deployment -> Source** выбрать **GitHub Actions**.

---

## 4. Готовый автоматический скрипт

В папке `scripts/deploy-to-github.ps1` доступен универсальный скрипт для вызова одной строкой:
```powershell
powershell -ExecutionPolicy Bypass -File "C:\Users\marym\.gemini\config\skills\github-deploy\scripts\deploy-to-github.ps1" -CommitMessage "Обновление проекта"
```
Скрипт автоматически:
1. Подтягивает путь к `git.exe`
2. Сбрасывает мешающие переменные прокси (`NO_PROXY`)
3. Инициализирует репозиторий при необходимости
4. Проверяет привязку к аккаунту `psychomanya`
5. Коммитит и пушит в ветку `main`
