@echo off
REM Hotel Diplomat Software - Development Setup Script (Windows)
REM This script helps new collaborators set up the development environment

echo 🏨 Hotel Diplomat Software - Development Setup
echo ==============================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js v16 or higher.
    echo    Download from: https://nodejs.org/
    pause
    exit /b 1
)

REM Check Node.js version
for /f "tokens=1,2,3 delims=." %%a in ('node --version') do set NODE_VERSION=%%a
set NODE_VERSION=%NODE_VERSION:~1%
if %NODE_VERSION% lss 16 (
    echo ❌ Node.js version 16 or higher is required. Current version: 
    node --version
    pause
    exit /b 1
)

echo ✅ Node.js version: 
node --version

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm.
    pause
    exit /b 1
)

echo ✅ npm version: 
npm --version

REM Install dependencies
echo 📦 Installing dependencies...
npm install

if %errorlevel% equ 0 (
    echo ✅ Dependencies installed successfully
) else (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

REM Create environment file if it doesn't exist
if not exist .env.local (
    echo 🔧 Creating environment file...
    copy env.example .env.local >nul
    echo ✅ Environment file created (.env.local)
    echo    Please edit .env.local with your configuration
) else (
    echo ✅ Environment file already exists
)

REM Check if Git is installed
git --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Git is installed
    
    REM Check if this is a Git repository
    if exist .git (
        echo ✅ Git repository initialized
        
        REM Check remote origin
        git remote get-url origin >nul 2>&1
        if %errorlevel% equ 0 (
            echo ✅ Remote origin configured: 
            git remote get-url origin
        ) else (
            echo ⚠️  No remote origin configured
        )
    ) else (
        echo ⚠️  This directory is not a Git repository
    )
) else (
    echo ⚠️  Git is not installed. Consider installing Git for version control.
)

echo.
echo 🎉 Setup completed successfully!
echo.
echo Next steps:
echo 1. Edit .env.local with your configuration
echo 2. Run 'npm run dev' to start the development server
echo 3. Open http://localhost:5173 in your browser
echo.
echo Happy coding! 🚀
pause 