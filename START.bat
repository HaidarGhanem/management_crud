@echo off

:: Start the backend server (app.js)
start cmd /c "node app.js"

timeout /t 2 /nobreak


start http://localhost:3000