@echo off
REM VisualAID Railway Deployment Script for Windows
REM This script helps you deploy your VisualAID application to Railway

echo 🚀 VisualAID Railway Deployment Script
echo ======================================

REM Check if git is initialized
if not exist ".git" (
    echo ❌ Git repository not found. Please initialize git first:
    echo    git init
    echo    git add .
    echo    git commit -m "Initial commit"
    pause
    exit /b 1
)

REM Check if .env.example exists
if not exist ".env.example" (
    echo 📝 Creating .env.example file...
    (
        echo # Backend Environment Variables
        echo NODE_ENV=production
        echo PORT=3000
        echo FRONTEND_URL=https://your-app.railway.app
        echo.
        echo # Database ^(Choose one^)
        echo # Option 1: Supabase PostgreSQL
        echo DATABASE_URL=postgresql://postgres.[project]:[password]@pooler.supabase.com:6543/postgres
        echo.
        echo # Option 2: Railway PostgreSQL ^(will be provided by Railway^)
        echo # DATABASE_URL=postgresql://postgres:[password]@[host]:[port]/[database]
        echo.
        echo # AI API Keys
        echo OPENAI_API_KEY=your_openai_api_key_here
        echo GEMINI_API_KEY=your_gemini_api_key_here
        echo.
        echo # CORS Configuration
        echo CORS_ORIGIN=https://your-app.railway.app
    ) > .env.example
    echo ✅ Created .env.example
)

REM Check if backend package.json exists
if not exist "backend\package.json" (
    echo ❌ Backend package.json not found. Please check your project structure.
    pause
    exit /b 1
)

REM Check if frontend package.json exists
if not exist "frontend\package.json" (
    echo ❌ Frontend package.json not found. Please check your project structure.
    pause
    exit /b 1
)

echo ✅ Project structure looks good!

echo.
echo 📋 Next Steps:
echo ==============
echo.
echo 1. 🔑 Get your API keys:
echo    - OpenAI API Key: https://platform.openai.com/api-keys
echo    - Google AI Studio Key: https://makersuite.google.com/app/apikey
echo.
echo 2. 🗄️ Set up your database:
echo    - Option A: Keep using Supabase ^(recommended^)
echo    - Option B: Use Railway's built-in PostgreSQL
echo.
echo 3. 🚀 Deploy to Railway:
echo    - Go to https://railway.app
echo    - Sign in with GitHub
echo    - Create new project from GitHub repo
echo    - Add environment variables in Railway dashboard
echo.
echo 4. 🌐 Deploy frontend to Netlify:
echo    - Go to https://netlify.com
echo    - Connect your GitHub repository
echo    - Set build command: 'cd frontend && npm run build'
echo    - Set publish directory: 'frontend/dist'
echo.
echo 5. 🔧 Configure environment variables:
echo    - In Railway: Add all variables from .env.example
echo    - In Netlify: Add VITE_API_URL=https://your-app.railway.app
echo.
echo 📖 For detailed instructions, see: RAILWAY_DEPLOYMENT_GUIDE.md
echo.
echo 🎉 Happy deploying!

REM Ask if user wants to open Railway
set /p "open_railway=Would you like to open Railway in your browser? (y/n): "
if /i "%open_railway%"=="y" (
    echo 🌐 Opening Railway...
    start https://railway.app
)

pause
