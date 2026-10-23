@echo off
REM MedCase - inicia backend, WhatsApp e Expo Go (cada um em uma janela)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0iniciar-testes.ps1"
echo.
pause
