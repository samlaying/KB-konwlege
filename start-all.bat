@echo off
start "KB-Backend" cmd /k "F:\samlay\KB-konwlege\start-backend.bat"
timeout /t 2 /nobreak >nul
start "KB-Frontend" cmd /k "F:\samlay\KB-konwlege\start-frontend.bat"
