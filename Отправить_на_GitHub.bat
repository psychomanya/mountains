@echo off
chcp 65001 >nul
cd /d "D:\Antigravity\Горы и вершины"

set "PATH=%LOCALAPPDATA%\GitHubDesktop\app-3.6.6\resources\app\git\cmd;%PATH%"
set "HTTP_PROXY="
set "HTTPS_PROXY="
set "ALL_PROXY="
set "http_proxy="
set "https_proxy="
set "all_proxy="

echo ========================================================
echo   Отправка проекта "Горы и вершины" на GitHub...
echo ========================================================
echo.
echo Сейчас может открыться окно браузера для авторизации.
echo Просто подтвердите вход в аккаунт psychomanya.
echo.

git push -u origin main

echo.
if %ERRORLEVEL% EQU 0 (
    echo ========================================================
    echo  [УСПЕХ!] Проект успешно опубликован на GitHub!
    echo  Репозиторий: https://github.com/psychomanya/mountains
    echo ========================================================
) else (
    echo ========================================================
    echo  [ОШИБКА] Не удалось отправить.
    echo ========================================================
)
echo.
pause
