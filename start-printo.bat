@echo off
title Printo Smart Self-Service Print Gateway
echo ========================================================
echo   Printo - Smart Auto-Print SaaS Gateway
echo ========================================================
echo.
echo [1/2] Starting Cloud Gateway / Web Server on Port 5000...
start "Printo Server" cmd /k "cd /d %~dp0server && npm start"

timeout /t 3 /nobreak > nul

echo.
echo [2/2] Starting Windows Desktop Print Agent...
start "Printo Agent" cmd /k "cd /d %~dp0agent && set SHOP_ID=shivam&& set PIN=4652&& npm start"

timeout /t 2 /nobreak > nul

echo.
echo ========================================================
echo  All systems running securely!
echo  - Customer Web App:      http://localhost:5000/s/shivam
echo  - Shopkeeper Admin:      http://localhost:5000/dashboard?shop=shivam
echo  - Print Counter Standee: http://localhost:5000/standee/shivam
echo ========================================================
echo.
pause
