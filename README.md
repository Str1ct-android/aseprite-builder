# aseprite-builder

![build](https://github.com/Str1ct-android/aseprite-builder/actions/workflows/check-and-build.yml/badge.svg)

Следит за релизами [aseprite/aseprite](https://github.com/aseprite/aseprite), показывает
обновления на пиксельном сайте и автоматически собирает Windows-инсталлятор, когда
выходит новый патч.

## что внутри

- `docs/` — статичный сайт (GitHub Pages). Пиксельный UI, кнопка **CHECK NOW**,
  панель **MY VERSION** (помнит установленную версию в localStorage), карточка
  последней сборки, changelog и история.
- `.github/workflows/check-and-build.yml` — раз в 6 часов проверяет upstream.
  Если вышел новый тег — собирает инсталлятор и кладёт его в **Artifacts** (приватно,
  доступ только владельцу). Кеширует Skia по тегу, чтобы не тянуть ~100 МБ каждый раз.
  Также есть ручной запуск и опциональное уведомление в Telegram.
- `scripts/check-update.py` — сравнивает последний релиз upstream с `docs/data.json`,
  обновляет трекер.
- `installer/` — упаковка через Inno Setup.

## как завести

1. Создай репозиторий `aseprite-builder` у себя на GitHub и запуш сюда весь код:
   ```
   git init
   git add .
   git commit -m "init"
   git branch -M main
   git remote add origin https://github.com/Str1ct-android/aseprite-builder.git
   git push -u origin main
   ```
2. **Settings → Pages → Build and deployment → Deploy from a branch**:
   ветка `main`, папка `/docs`. Сайт поднимется на
   `https://str1ct-android.github.io/aseprite-builder/`.
3. **Actions** → открой workflow *Check & Build Aseprite* → **Run workflow**.
   Первый запуск соберёт текущий релиз (сейчас `v1.3.18.1`) и положит
   `aseprite-setup.exe` в Releases. Дальше — автопроверка каждые 6 часов.

Никаких секретов настраивать не надо: `GITHUB_TOKEN` выдаётся автоматически,
сайт ходит в публичный GitHub API без токена.

## уведомления в Telegram (опционально)

Когда сборка завершена, бот присылает в Telegram сообщение: версию, sha256, ссылку
на инсталлятор и **полный changelog** релиза. Это push-нотификатор (не интерактивный
бот — отвечать ему не нужно, сервер не требуется, всё работает из GitHub Actions).

Настройка (один раз):
1. В Telegram открой **@BotFather** → `/newbot` → придумай имя → получишь **токен** вида
   `1234567890:ABC...`.
2. Напиши своему новому боту любое сообщение, затем узнай свой chat id:
   открой `https://api.telegram.org/bot<ТОКЕН>/getUpdates` — там `chat.id` (число).
3. В репозитории: **Settings → Secrets and variables → Actions → New repository secret**:
   - `TG_BOT_TOKEN` = токен из шага 1
   - `TG_CHAT_ID` = chat id из шага 2
4. Готово. Шаг `Notify Telegram` в workflow сработает на следующей удачной сборке.
   Если секреты не заданы — шаг молча пропускается.

## как пользоваться сайтом

- **CHECK NOW** — прямо в браузере спрашивает upstream, есть ли новее, чем у тебя.
- **DOWNLOAD .EXE** — качает инсталлятор и отмечает эту версию как установленную.
- **SET INSTALLED** / **SET MINE** — вручную указать, какая версия сейчас стоит,
  чтобы не путаться.
- **RUN BUILD** — ссылка на вкладку Actions для ручного запуска сборки.

## лицензия / disclaimer

Aseprite распространяется по EULA — компилировать для личного использования можно,
а вот собранные бинарники публично не редистрибьютьить. Поэтому готовый инсталлятор
**не публикуется в публичные Releases** — он складывается в **GitHub Artifacts**,
скачать которые может только владелец репозитория после входа в свой аккаунт.
Публичным остаётся только сайт-трекер (без бинарников), как и
[оригинальный билдер](https://github.com/theguywhoslate/aseprite-builder).
Исходники тут — MIT.

Скачать свой инсталлятор: сайт → **DOWNLOAD .EXE** (откроется страница сборки,
нужен вход в GitHub) → секция **Artifacts** в самом низу → скачать
`aseprite-vX.Y.Z`.
