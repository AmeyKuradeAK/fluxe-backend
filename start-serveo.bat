@echo off
echo.
echo 🌐 Starting Serveo Tunnel (No Password Required)
echo ===============================================
echo.
echo 📍 Make sure your server is running on port 3000
echo 🚀 Starting Serveo tunnel...
echo.
echo 💡 This will create a public HTTPS URL instantly
echo.

ssh -R 80:localhost:3000 serveo.net

echo.
echo 🛑 Tunnel stopped
pause
