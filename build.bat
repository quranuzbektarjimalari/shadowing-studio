@echo off
setlocal
chcp 65001 >nul
title Shadowing Studio - .exe o'rnatuvchisini yaratish
cd /d "%~dp0"

echo ============================================================
echo   Shadowing Studio - Windows o'rnatuvchisini yaratish
echo ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 goto no_node

where npm >nul 2>nul
if errorlevel 1 goto no_node

echo [1/2] Kerakli paketlar yuklab olinmoqda. Birinchi marta 3-10 daqiqa ketadi...
call npm install
if errorlevel 1 goto failed

echo.
echo [2/2] .exe fayllar yig'ilmoqda...
call npm run dist
if errorlevel 1 goto failed

echo.
echo ============================================================
echo   TAYYOR!  Fayllar "dist" papkasida:
echo     Shadowing-Studio-Setup-*.exe     - o'rnatuvchi (tarqatish uchun)
echo     Shadowing-Studio-Portable-*.exe  - o'rnatmasdan ishlaydigan nusxa
echo ============================================================
if exist dist start "" explorer "dist"
pause
exit /b 0

:no_node
echo XATO: Node.js topilmadi.
echo Avval https://nodejs.org saytidan LTS versiyasini o'rnating,
echo keyin bu faylni qayta ishga tushiring.
start "" https://nodejs.org
pause
exit /b 1

:failed
echo.
echo XATO yuz berdi. Yuqoridagi xabarni o'qing.
echo Agar xabarda "symbolic link" yoki "privilege" so'zlari bo'lsa:
echo   - build.bat ni sichqonchaning o'ng tugmasi - "Administrator sifatida ishga tushirish" orqali oching, yoki
echo   - Windows sozlamalaridan Developer Mode ni yoqing, so'ng qayta urinib ko'ring.
pause
exit /b 1
