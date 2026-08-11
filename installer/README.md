# installer

Windows-инсталлятор собирается в CI через Inno Setup. Файл `aseprite.iss`
генерируется на лету в джобе `build` (см. `.github/workflows/check-and-build.yml`),
после компиляции Aseprite в `build/bin`.

Результат — `installer/aseprite-setup.exe`. Готовый файл **не уходит в публичные
Releases** (EULA): он публикуется в **Artifacts** сборки под именем
`aseprite-<версия>`, скачать может только владелец репозитория после входа в GitHub.
SHA-256 инсталлятора записывается в `docs/data.json` (`installer_sha256`).

Локально собирать инсталлятор не нужно: всё делает GitHub Actions на `windows-latest`.
