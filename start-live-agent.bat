@echo off
title Printo Live Desktop Print Agent
echo ========================================================
echo   Printo Live Desktop Auto-Print Agent
echo   Connecting your Physical Printer to Cloud...
echo ========================================================
echo.
set /p SHOP_ID="Enter your Shop ID (Press Enter for default: shivam): "
if "%SHOP_ID%"=="" set SHOP_ID=shivam
set SERVER_URL=https://printo-production-7fad6f69.up.railway.app
echo.
echo [CONNECTING] Shop: %SHOP_ID%
echo [SERVER] %SERVER_URL%
echo.
cd /d "%~dp0agent"
node agent.js
pause

