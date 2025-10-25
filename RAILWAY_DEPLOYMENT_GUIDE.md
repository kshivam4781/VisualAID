# 🚀 VisualAID Railway Deployment Guide

## Overview

This guide will help you deploy your VisualAID application to Railway. Your project consists of:

- **Frontend**: React + TypeScript (Vite)
- **Backend**: Node.js + Express + Socket.io
- **Database**: PostgreSQL (Supabase or Railway PostgreSQL)
- **AI Services**: OpenAI GPT-4o + Google Gemini 2.0

## Prerequisites

✅ **Required Accounts:**
- [Railway Account](https://railway.app) (Free tier available)
- [GitHub Account](https://github.com) (for code repository)
- [OpenAI API Key](https://platform.openai.com/api-keys)
- [Google AI Studio Key](https://makersuite.google.com/app/apikey)

✅ **Optional (for database):**
- [Supabase Account](https://supabase.com) (Free PostgreSQL)
- OR use Railway's built-in PostgreSQL

## Step 1: Prepare Your Repository

### 1.1 Create GitHub Repository

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit: VisualAID MVP"

# Create GitHub repository and push
git remote add origin https://github.com/yourusername/visualaid.git
git push -u origin main
```

### 1.2 Environment Variables Setup

Create a `.env.example` file in your project root:

```bash
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
```

## Step 2: Railway Deployment

### 2.1 Create Railway Project

1. Go to [Railway.app](https://railway.app)
2. Sign in with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your VisualAID repository

### 2.2 Configure Railway Settings

Railway will auto-detect your Node.js project. Configure these settings:

**Build Settings:**
- **Root Directory**: Leave empty (uses project root)
- **Build Command**: `cd backend && npm install`
- **Start Command**: `cd backend && npm start`

**Environment Variables:**
Add these in Railway dashboard → Variables tab:

```bash
NODE_ENV=production
PORT=3000
OPENAI_API_KEY=your_openai_key_here
GEMINI_API_KEY=your_gemini_key_here
```

### 2.3 Database Setup

**Option A: Use Supabase (Recommended)**
1. Keep your existing Supabase setup
2. Add to Railway variables:
   ```bash
   DATABASE_URL=postgresql://postgres.[project]:[password]@pooler.supabase.com:6543/postgres
   ```

**Option B: Use Railway PostgreSQL**
1. In Railway dashboard, click "New" → "Database" → "PostgreSQL"
2. Railway will provide `DATABASE_URL` automatically
3. Run your schema: `database/schema.sql` in Railway's database console

### 2.4 Frontend Configuration

Since Railway primarily hosts backends, you have two options:

**Option A: Deploy Frontend Separately (Recommended)**
- Deploy frontend to [Netlify](https://netlify.com) or [Vercel](https://vercel.com)
- Update `FRONTEND_URL` in Railway to your frontend URL

**Option B: Serve Frontend from Railway**
- Modify your backend to serve static files
- Add to Railway variables: `FRONTEND_URL=https://your-app.railway.app`

## Step 3: Backend Modifications for Railway

### 3.1 Update Server Configuration

Your `backend/src/server.js` should handle Railway's PORT environment variable:

```javascript
const PORT = process.env.PORT || 3000;
```

### 3.2 CORS Configuration

Update CORS settings in your backend:

```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
```

### 3.3 Health Check Endpoint

Ensure your `/health` endpoint is working:

```javascript
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});
```

## Step 4: Database Migration

### 4.1 Run Database Schema

Connect to your database and run the schema:

```sql
-- Run the contents of database/schema.sql
-- This creates all necessary tables and indexes
```

### 4.2 Test Database Connection

Your backend should automatically connect using the `DATABASE_URL` environment variable.

## Step 5: Deploy and Test

### 5.1 Deploy to Railway

1. Railway will automatically deploy when you push to GitHub
2. Check the deployment logs in Railway dashboard
3. Your app will be available at: `https://your-app.railway.app`

### 5.2 Test Your Deployment

```bash
# Test health endpoint
curl https://your-app.railway.app/health

# Test database connection
curl https://your-app.railway.app/api/test-db

# Test WebSocket connection (if applicable)
# Use a WebSocket client to connect to your Railway URL
```

## Step 6: Frontend Deployment (Netlify)

### 6.1 Build Frontend

```bash
cd frontend
npm run build
```

### 6.2 Deploy to Netlify

1. Go to [Netlify](https://netlify.com)
2. Connect your GitHub repository
3. Set build settings:
   - **Build command**: `cd frontend && npm run build`
   - **Publish directory**: `frontend/dist`
4. Add environment variable:
   - `VITE_API_URL=https://your-app.railway.app`

### 6.3 Update Backend CORS

Update your Railway environment variable:
```bash
FRONTEND_URL=https://your-frontend.netlify.app
```

## Step 7: Production Configuration

### 7.1 Environment Variables Summary

**Railway Variables:**
```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
FRONTEND_URL=https://your-frontend.netlify.app
```

**Netlify Variables:**
```bash
VITE_API_URL=https://your-app.railway.app
```

### 7.2 SSL/HTTPS

Railway and Netlify provide automatic HTTPS certificates.

## Step 8: Monitoring and Maintenance

### 8.1 Railway Dashboard

- Monitor logs in Railway dashboard
- Check resource usage
- View deployment history

### 8.2 Database Monitoring

- Use Supabase dashboard for database management
- Monitor query performance
- Check connection limits

### 8.3 Cost Monitoring

- Railway: Free tier includes $5 credit/month
- Supabase: Free tier includes 500MB database
- OpenAI/Gemini: Monitor API usage in respective dashboards

## Troubleshooting

### Common Issues

**1. Build Failures**
```bash
# Check Railway logs for specific errors
# Ensure all dependencies are in package.json
```

**2. Database Connection Issues**
```bash
# Verify DATABASE_URL format
# Check if database is accessible from Railway
```

**3. CORS Issues**
```bash
# Update FRONTEND_URL in Railway
# Check CORS configuration in backend
```

**4. WebSocket Issues**
```bash
# Ensure Socket.io is properly configured
# Check if Railway supports WebSocket connections
```

### Debug Commands

```bash
# Check environment variables
echo $DATABASE_URL

# Test database connection
node -e "console.log(process.env.DATABASE_URL)"

# Check if all dependencies are installed
npm list --depth=0
```

## Cost Estimation

**Monthly Costs (Approximate):**

| Service | Free Tier | Paid Tier |
|---------|-----------|-----------|
| Railway | $5 credit | $5-20/month |
| Supabase | 500MB DB | $25/month |
| OpenAI API | Pay-per-use | $50-200/month |
| Gemini API | Pay-per-use | $10-50/month |
| Netlify | 100GB bandwidth | Free |

**Total Estimated Cost: $5-20/month (excluding AI API usage)**

## Next Steps

1. ✅ Deploy backend to Railway
2. ✅ Deploy frontend to Netlify
3. ✅ Configure environment variables
4. ✅ Test all endpoints
5. ✅ Monitor performance and costs
6. ✅ Set up monitoring and alerts

## Support

- [Railway Documentation: https://docs.railway.app](https://docs.railway.app)
- [Railway Discord: https://discord.gg/railway](https://discord.gg/railway)
- [VisualAID GitHub Issues: Create an issue in your repository]

---

**🎉 Congratulations! Your VisualAID application is now deployed on Railway!**

Your app will be available at:
- **Backend**: `https://your-app.railway.app`
- **Frontend**: `https://your-frontend.netlify.app`
- **Database**: Managed by Supabase or Railway PostgreSQL
