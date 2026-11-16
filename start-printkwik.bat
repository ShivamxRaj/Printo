@echo off
title PrintKwik Smart Self-Service Print Gateway
echo ========================================================
echo   PrintKwik - Smart Auto-Print SaaS Gateway
echo ========================================================
echo.
echo [1/2] Starting Cloud Gateway / Web Server on Port 5000...
start "PrintKwik Server" cmd /k "cd /d %~dp0server && npm start"

timeout /t 3 /nobreak > nul

echo.
echo [2/2] Starting Windows Desktop Print Agent...
start "PrintKwik Agent" cmd /k "cd /d %~dp0agent && npm start"

timeout /t 2 /nobreak > nul

echo.
echo ========================================================
echo  All systems running!
echo  - Customer Web App:    http://localhost:5000/s/demo-shop
echo  - Shopkeeper Admin:    http://localhost:5000/dashboard
echo  - Print Counter Standee: http://localhost:5000/standee/demo-shop
echo ========================================================
echo.
pause

