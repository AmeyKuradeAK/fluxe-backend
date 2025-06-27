@echo off
echo.
echo 🌍 Starting ngrok tunnel for Flutter Project Generator API
echo ========================================================
echo.
echo 📍 Local server should be running on port 3000
echo 🚀 Starting ngrok tunnel...
echo.

ngrok http 3000

echo.
echo 🛑 ngrok tunnel stopped
pause
