@echo off
title Servidor de Citas Medicas - QA
echo ========================================================
echo   Iniciando Servidor de Citas Medicas (Auditado)
echo ========================================================
echo.
echo Abriendo aplicacion en http://localhost:3000
start http://localhost:3000
node src/server.js
pause
