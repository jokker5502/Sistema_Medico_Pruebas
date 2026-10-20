@echo off
title Ejecutar Auditoria Jest con Cobertura de Ramas
echo ========================================================
echo   Ejecutando Pruebas de Caja Blanca y Cobertura (Jest)
echo ========================================================
echo.
call npm test:coverage
echo.
pause
