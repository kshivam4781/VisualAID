#!/bin/bash

# VisualAID Railway Deployment Script
# This script helps you deploy your VisualAID application to Railway

echo "🚀 VisualAID Railway Deployment Script"
echo "======================================"

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git repository not found. Please initialize git first:"
    echo "   git init"
    echo "   git add ."
    echo "   git commit -m 'Initial commit'"
    exit 1
fi

# Check if .env.example exists
if [ ! -f ".env.example" ]; then
    echo "📝 Creating .env.example file..."
    cat > .env.example << 'EOF'
# Backend Environment Variables
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-app.railway.app

# Database (Choose one)
# Option 1: Supabase PostgreSQL
DATABASE_URL=postgresql://postgres.[project]:[password]@pooler.supabase.com:6543/postgres

# Option 2: Railway PostgreSQL (will be provided by Railway)
# DATABASE_URL=postgresql://postgres:[password]@[host]:[port]/[database]

# AI API Keys
OPENAI_API_KEY=your_openai_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here

# CORS Configuration
CORS_ORIGIN=https://your-app.railway.app
EOF
    echo "✅ Created .env.example"
fi

# Check if backend package.json exists
if [ ! -f "backend/package.json" ]; then
    echo "❌ Backend package.json not found. Please check your project structure."
    exit 1
fi

# Check if frontend package.json exists
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Frontend package.json not found. Please check your project structure."
    exit 1
fi

echo "✅ Project structure looks good!"

echo ""
echo "📋 Next Steps:"
echo "=============="
echo ""
echo "1. 🔑 Get your API keys:"
echo "   - OpenAI API Key: https://platform.openai.com/api-keys"
echo "   - Google AI Studio Key: https://makersuite.google.com/app/apikey"
echo ""
echo "2. 🗄️ Set up your database:"
echo "   - Option A: Keep using Supabase (recommended)"
echo "   - Option B: Use Railway's built-in PostgreSQL"
echo ""
echo "3. 🚀 Deploy to Railway:"
echo "   - Go to https://railway.app"
echo "   - Sign in with GitHub"
echo "   - Create new project from GitHub repo"
echo "   - Add environment variables in Railway dashboard"
echo ""
echo "4. 🌐 Deploy frontend to Netlify:"
echo "   - Go to https://netlify.com"
echo "   - Connect your GitHub repository"
echo "   - Set build command: 'cd frontend && npm run build'"
echo "   - Set publish directory: 'frontend/dist'"
echo ""
echo "5. 🔧 Configure environment variables:"
echo "   - In Railway: Add all variables from .env.example"
echo "   - In Netlify: Add VITE_API_URL=https://your-app.railway.app"
echo ""
echo "📖 For detailed instructions, see: RAILWAY_DEPLOYMENT_GUIDE.md"
echo ""
echo "🎉 Happy deploying!"

# Check if user wants to open Railway
read -p "Would you like to open Railway in your browser? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🌐 Opening Railway..."
    if command -v open &> /dev/null; then
        open https://railway.app
    elif command -v xdg-open &> /dev/null; then
        xdg-open https://railway.app
    else
        echo "Please visit: https://railway.app"
    fi
fi
