# VisualAID - Visual Assistance App for Visually Impaired Users

## Project Overview

VisualAID is an MVP designed to help visually impaired individuals navigate their surroundings safely and independently through real-time visual analysis and conversational AI assistance.

## Project Status

✅ **Phase 0 Complete** - Database & Backend Setup  
✅ **Phase 1.1 Complete** - Voice Input with Web Speech API  
✅ **Phase 1.2 Complete** - Voice Output (Text-to-Speech)  
✅ **Phase 1.3 Complete** - Basic Menu System

### Completed Features
- ✅ Database Setup (Supabase PostgreSQL with optimized schema)
- ✅ Backend API (Node.js + Express with WebSocket)
- ✅ Frontend Structure (React + TypeScript with Vite)
- ✅ Voice Recognition (Web Speech API)
- ✅ Wake Word Detection ("be my eye" / "stop be my eye")
- ✅ Text-to-Speech with Natural Greetings
- ✅ Real-time Transcript Display
- ✅ Command Confidence Scoring
- ✅ Main Menu System with Voice Navigation
- ✅ Help Command with Detailed Instructions
- ✅ Beautiful Responsive UI

## Core Concept

When users say **"be my eye"**, the app:
- Activates camera and captures frames every 5 seconds
- Analyzes each frame for important objects and obstacles
- Provides conversational descriptions via voice
- Tracks and alerts about obstacles on the path
- Returns to main menu when user says **"stop be my eye"**

## 🚀 Quick Start

### 1. Start Frontend (Phase 1.1 Ready!)
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in Chrome/Edge

### 2. Start Backend (Optional for Phase 1.1)
```bash
cd backend
npm install
npm start
```
Backend runs on `http://localhost:3000`

### 3. Try Voice Commands
- Say **"be my eye"** to activate vision mode
- Say **"stop be my eye"** to deactivate
- Watch real-time transcripts and confidence scores!

📖 See [QUICK_START.md](QUICK_START.md) for detailed instructions

## MVP Technology Stack

### Frontend
- **React + TypeScript** - Fast development, type safety
- **Web Speech API** - Voice input/output (no cloud required)
- **Local Camera** - `getUserMedia()` for video capture
- **WebSocket** - Real-time communication with backend

### Backend
- **Node.js + Express** - Fast, simple API server
- **PostgreSQL** - Database with indexing and optimization (Supabase)
- **Socket.io** - WebSocket library for real-time communication

### AI APIs (External Services)
- **Gemini 2.0 Flash** - Fast image analysis, obstacle detection, depth estimation
- **ChatGPT (GPT-4o)** - Conversational AI, registration flow, natural responses

## System Architecture

```
┌─────────────────────────────────────┐
│     React PWA (Frontend)            │
│  - Camera Capture                   │
│  - Voice I/O (Web Speech API)      │
│  - WebSocket Client                 │
└────────────┬────────────────────────┘
             │ WebSocket
             ▼
┌─────────────────────────────────────┐
│   Node.js + Express Backend         │
│  - Frame Receiver                   │
│  - PostgreSQL Connection            │
│  - Session Management               │
│  - API Gateway to AI services       │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│      AI APIs (When Needed)          │
│  • Gemini (Images & Speed)          │
│  • ChatGPT (Conversational)          │
└─────────────────────────────────────┘
```

## Database Schema (PostgreSQL)

See [database/schema.sql](./database/schema.sql) for the complete optimized schema.

**Key Features:**
- **UUID primary keys** for better distribution
- **JSONB** columns for AI analysis (faster than JSON)
- **Indexes** on frequently queried columns
- **GIN indexes** for JSONB searches
- **Full-text search** indexes for notes
- **Helper functions** for common queries
- **Views** for dashboard and reporting

**Tables:**
- `users` - User accounts with email indexing
- `emergency_contacts` - Emergency contacts with primary contact flag
- `session_frames` - Camera frames with AI analysis (JSONB)
- `danger_alerts` - Safety alerts with severity levels
- `user_notes` - Notes with full-text search capability
- `active_sessions` - Track active vision sessions

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for database setup instructions.  
See [RAILWAY_SETUP.md](./RAILWAY_SETUP.md) for Railway deployment alternative.

## MVP Feature Flow

### 1. Registration Flow (Conversational)
- User opens app → Voice greeting
- If not registered, ChatGPT asks: "Mind if I ask you some questions?"
- Conversational registration:
  - Name → Validation + encouraging response
  - Email → Validation
  - Password → "Give me a phrase with at least 5 words"
  - Emergency Contact → **Mandatory** (with default option)

**Default Emergency Contact:**
- Name: Sky Transport Solutions
- Phone: 3502178666
- Email: @skytransportsolutions.com

### 2. "Be My Eye" Mode
- Activates camera
- Captures frame every 5 seconds
- Sends to Gemini for analysis
- Provides frame-by-frame descriptions
- Tracks obstacles and alerts user
- Stops when user says "stop be my eye"

### 3. Main Menu Features
- Voice greeting on app open
- Options: "How can I help?"
- Latest news
- Other assistance features

## AI API Strategy

### Gemini 2.0 Flash Usage
- **Frame Analysis** - Fast descriptions of each frame
- **Obstacle Detection** - Identifies and prioritizes obstacles
- **Depth Estimation** - Rough distance of objects
- **Note Recognition** - OCR for finding notes

### ChatGPT (GPT-4o) Usage
- **Conversational Logic** - Natural dialogue flow
- **Registration Flow** - Smooth onboarding
- **Navigation Instructions** - Convert Google Maps into conversational directions
- **Emergency Responses** - Handle urgent situations

## MVP Code Structure

```
app/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CameraCapture.tsx
│   │   │   ├── VoiceInterface.tsx
│   │   │   └── MainMenu.tsx
│   │   ├── services/
│   │   │   ├── websocket.ts
│   │   │   └── api.ts
│   │   └── App.tsx
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── frames.js
│   │   │   └── voice.js
│   │   ├── services/
│   │   │   ├── geminiService.js
│   │   │   ├── chatgptService.js
│   │   │   └── sessionManager.js
│   │   ├── models/
│   │   │   └── database.js
│   │   └── server.js
│   └── package.json
└── database/
    └── schema.sql
```

## Additional Features (Post-MVP)

1. **Danger Detection** - Auto-detect dangerous situations, save images, send email alerts
2. **Notes Tracking** - Remember where user keeps notes using OCR
3. **Navigation Integration** - Google Maps API + conversational directions via ChatGPT
4. **Speed Tracking** - Rough estimation of walking speed
5. **Important Moments** - Capture and save significant events

## Technical Challenges & Solutions

### Challenge 1: Frame Processing Speed
- **Solution**: Use Gemini Flash (fastest), process frames async, skip redundant analysis

### Challenge 2: Context Tracking
- **Solution**: Keep last 3-5 analyses in memory, compare current frame with previous

### Challenge 3: Depth Estimation
- **Solution**: Use Gemini's spatial understanding + device sensors if available

### Challenge 4: Conversational Flow
- **Solution**: ChatGPT manages state, remembers user context throughout session

## Privacy & Security

- All sensitive data encrypted in MySQL
- No cloud storage except necessary API calls
- Emergency contacts stored securely
- User consent required for all features

## Cost Estimates (MVP)

- **Gemini**: ~$0.10-0.50 per 1K frames
- **ChatGPT**: ~$0.50-2 per 1K interactions
- **MySQL**: Free (local) or Free hosting option
- **Hosting**: Free tier options available
- **Total Expected**: $50-200/month for testing + APIs

## MVP Priority Features

### Must-Have ✅
1. Voice interface with greeting
2. Camera capture (5-second intervals)
3. Gemini frame analysis with descriptions
4. Basic obstacle detection and alerts
5. Conversational registration via ChatGPT
6. Default emergency contact setup
7. Stop command functionality

### Should-Have ⚠️
1. Context tracking (ignore already described objects)
2. Danger alerts with image saving
3. Session management

### Nice-to-Have 💡
1. Google Maps navigation integration
2. Notes OCR feature
3. Speed estimation
4. Latest news features

## Development Roadmap

See [ROADMAP.md](./ROADMAP.md) for detailed step-by-step development plan.

**Quick Summary:**
- **Phase 0:** Project setup & infrastructure (2-3 days)
- **Phase 1:** Basic voice interface (3-4 days)
- **Phase 2:** Camera & frame capture (3-4 days)
- **Phase 3:** Gemini AI integration (4-5 days)
- **Phase 4:** ChatGPT AI integration (4-5 days)
- **Phase 5:** User registration (4-5 days)
- **Phase 6:** Context tracking (5-6 days)
- **Phase 7:** Safety features (4-5 days)
- **Phase 8:** Testing & refinement (5-7 days)

**Total MVP Timeline:** 6-8 weeks

**Progress Tracking:** As you complete each step in the ROADMAP.md file, mark the checkboxes as completed using `- [x]` instead of `- [ ]`. This helps track your progress and see what's remaining.

## Success Criteria

- User can register via voice
- "Be my eye" activates and describes surroundings
- Obstacles are detected and communicated
- "Stop" returns to main menu
- Emergency contacts are stored
- App responds naturally to voice commands

## Hosting Strategy

Since this is a full-stack application with a backend and database, here are the hosting options:

### Recommended Setup

**Frontend Hosting:**
- **Netlify** (Recommended) - Free tier, supports single-page apps, automatic HTTPS
- **Vercel** - Free tier, excellent for React apps
- **Railway** - Can also host frontend if preferred

**Backend Hosting:**
- **Railway** (Recommended) - Easy deployment, your paid plan
- **Render** - Free tier alternative
- **Heroku** - Paid option

**Database Hosting:**
- **Supabase PostgreSQL** (Recommended) - Free tier with 500MB, auto-generated APIs
- **Railway PostgreSQL** - Alternative with your paid Railway plan

### Best Setup for Your Case:
1. **Frontend:** Netlify (free)
2. **Backend:** Railway (your paid plan)
3. **Database:** Supabase PostgreSQL (free tier)

**Total Cost:** Railway subscription + Netlify free tier + Supabase free tier

### Deployment Steps:

#### Database Setup (Supabase):
1. Create Supabase account at [supabase.com](https://supabase.com)
2. Create new project and select region
3. Go to SQL Editor and run `database/schema.sql`
4. Get connection string from Settings → Database
5. Use **Pooler connection** (port 6543) for deployment

#### Frontend (Netlify):
1. Build your React app: `npm run build`
2. Push to GitHub
3. Connect Netlify to your GitHub repo
4. Deploy automatically on every push

#### Backend (Railway):
1. Create a new Railway project
2. Connect Railway to your GitHub repo
3. Railway will auto-detect Node.js
4. **Set Environment Variables:**
   - `GEMINI_API_KEY` - Your Gemini API key
   - `OPENAI_API_KEY` - Your ChatGPT API key
   - `DATABASE_URL` - Supabase Pooler connection string
   - `FRONTEND_URL` - Your Netlify frontend URL (for CORS)
5. Deploy automatically

**Key Point:** Supabase database is external to Railway, so you use the Pooler connection string for secure access.

### Important Notes:
- Store API keys (Gemini, ChatGPT) as environment variables
- Use HTTPS for production (included in Netlify/Railway)
- Supabase PostgreSQL is managed and auto-scales
- Use **Pooler connection** (not Direct) for Railway compatibility
- Use connection pooling for efficiency (built into `pg` library)
- Database persists even if backend redeploys
- JSONB support for efficient AI data storage
- Supabase provides auto-generated REST APIs (bonus feature!)

### Alternative: Development Only
- Run locally for testing
- Use Supabase Dashboard SQL Editor for database management
- Use pgAdmin or DBeaver to connect to Supabase PostgreSQL
- Only deploy when ready for demo/testing

## Future Enhancements

- Native mobile apps (iOS/Android)
- Advanced depth sensors integration
- Multi-language support
- Offline mode with edge processing
- Community features
- Professional caregiver dashboard

