# TSR_M Messenger

## Как запустить локально

1. Установите зависимости:
   ```bash
   npm install
   ```
2. Постройте фронтенд:
   ```bash
   npm run build
   ```
3. Запустите сервер:
   ```bash
   npm start
   ```
4. Откройте браузер:
   ```
   http://localhost:4174
   ```

## Как запустить без компьютера

### В Docker

1. Постройте контейнер:
   ```bash
   docker build -t tsr-messenger .
   ```
2. Запустите контейнер:
   ```bash
   docker run -p 4174:4174 tsr-messenger
   ```
3. Адрес будет:
   ```
   http://localhost:4174
   ```

### Деплой на удалённый хостинг

Проект готов для хостинга на платформах с поддержкой Node.js или Docker.

Вариант 1: Render (рекомендуется для быстрого удалённого запуска)
1. Зарегистрируйтесь на https://render.com.
2. Создайте новый Web Service.
3. Подключите репозиторий с этим проектом.
4. Укажите команду сборки:
   ```bash
   npm install && npm run build
   ```
5. Укажите команду запуска:
   ```bash
   npm start
   ```
6. Установите переменную окружения `PORT=4174`, если платформа не задаёт порт автоматически.
7. После деплоя Render выдаст публичный URL вида `https://<имя-приложения>.onrender.com`. Это и будет адрес, который вы можете отправить другу.

Вариант 2: Fly.io / Railway / Heroku / DigitalOcean
- Используйте `Dockerfile` или `npm start`.
- Порт готов к использованию через `process.env.PORT`.
- При деплое платформа выдаст публичный URL, например `https://<app-name>.fly.dev`.

### Публичный доступ без вашего ПК

Для доступа без вашего компьютера проект должен быть развёрнут на удалённом хостинге.

- Локальный `localhost` не доступен друзьям.
- Фактический публичный URL будет выдан хостинг-платформой после деплоя.
- Пример: `https://tsr-messenger.onrender.com` если вы назовёте приложение `tsr-messenger` на Render.

Если вы хотите временный публичный доступ прямо с вашего ПК, используйте туннель:
- `ngrok http 4174`
- `lt --port 4174` (localtunnel)
- `cloudflared tunnel http 4174`

Но для работы без вашего компьютера обязательно используйте удалённый хостинг.

## Полный гайд: деплой на Render

### Шаг 0: Подготовка GitHub репозитория

1. Создайте или откройте ваш GitHub репозиторий: https://github.com/new
2. Загрузьте туда файлы проекта:
   ```bash
   git init
   git add .
   git commit -m "Initial TSR_M messenger commit"
   git branch -M main
   git remote add origin https://github.com/vanqwit-sudo/TSR_M.git
   git push -u origin main
   ```

### Шаг 1: Регистрация на Render

1. Перейдите на https://render.com
2. Нажмите `Sign Up` (регистрация через GitHub рекомендуется для удобства)
3. Подтвердите email

### Шаг 2: Подключение репозитория и создание Web Service

1. В Render нажмите `+ New` → `Web Service`
2. Выберите `Connect a repository`
3. Авторизуйте GitHub (если ещё не сделали)
4. Найдите и выберите ваш репозиторий с TSR_M
5. Нажмите `Connect`

### Шаг 3: Настройка Web Service

1. **Name**: введите имя приложения, например `tsr-messenger`
2. **Environment**: `Node`
3. **Build Command**: 
   ```bash
   npm install && npm run build
   ```
4. **Start Command**:
   ```bash
   npm start
   ```
5. **Instance Type**: выберите `Free` (для начала) или платный вариант
6. Нажмите `Create Web Service`

### Шаг 4: Ожидание деплоя

Render начнёт билд и деплой. Это займёт 2-5 минут.
- Вы увидите логи сборки в реальном времени
- После успеха вверху появится зелёная галочка
- Ваш публичный URL будет вида: `https://tsr-messenger.onrender.com`

> Именно этот URL отправьте другу!

### Шаг 5: Проверка приложения

1. Откройте ваш публичный URL в браузере
2. Попробуйте войти с учётными данными:
   - Телефон: `+70000000001`, Пароль: `123456`
   - Или регистрируйтесь заново
3. Если работает — готово!

## Как обновлять приложение на Render

1. Внесите изменения в код локально.
2. Закоммитьте их и запушьте в репозиторий:
   ```bash
   git add .
   git commit -m "Ваше описание изменений"
   git push
   ```
3. Render автоматически запустит новый билд и развернёт обновление на том же URL.
4. Если автодеплой не включён, откройте Render → ваш Web Service → нажмите `Manual Deploy`.

> Публичный URL останется прежним при всех обновлениях.

## Полезные ссылки

- **Render**: https://render.com
- **Документация Render**: https://render.com/docs
- **GitHub**: https://github.com
- **Node.js на Render**: https://render.com/docs/deploy-node-express-app
- **Переменные окружения на Render**: https://render.com/docs/environment-variables

## Если что-то не работает

- Проверьте логи в Render → ваш Web Service → `Logs`
- Убедитесь, что `package.json` содержит все зависимости
- Проверьте, что `Dockerfile` и `server.js` на месте
- Перезагрузите страницу браузера (Ctrl+Shift+Delete для очистки кэша)
