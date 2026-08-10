# installer

Windows-инсталлятор собирается в CI через Inno Setup. Файл `aseprite.iss`
генерируется на лету в джобе `build` (см. `.github/workflows/check-and-build.yml`),
после компиляции Aseprite в `build/bin`.

Результат — `installer/aseprite-setup.exe`, который публикуется в Release с тегом
версии Aseprite (`vX.Y.Z`).

Локально собирать инсталлятор не нужно: всё делает GitHub Actions на `windows-latest`.
