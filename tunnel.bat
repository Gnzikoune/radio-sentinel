@echo off
chcp 65001 >nul
title Radio Sentinel - Tunnel Nomade 4G
powershell -ExecutionPolicy Bypass -File "%~dp0tunnel.ps1"
pause
