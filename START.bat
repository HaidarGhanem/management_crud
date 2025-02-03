@echo off

:: Start the backend server (app.js)
start "node app.js"

timeout /t 2 /nobreak


start http://localhost:5173