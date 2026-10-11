@echo off
setlocal
chcp 65001 >nul
title Shadowing Studio - sinov rejimi
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo XATO: Node.js topilmadi. https://nodejs.org dan LTS ni o'rnating.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Paketlar yuklab olinmoqda...
  call npm install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)

call npm start
