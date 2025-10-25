# 🚀 Phase 3: Gemini AI Integration Setup Guide

## ✅ What We've Built

Phase 3 adds **AI-powered vision analysis** to VisualAID! Here's what's now working:

### New Features:
1. **🤖 Gemini AI Service** - Analyzes camera frames in real-time
2. **🎯 Obstacle Detection** - Identifies and prioritizes dangers
3. **🚨 Danger Alerts** - Automatic warnings for critical obstacles
4. **💾 Smart Storage** - AI analysis stored in PostgreSQL (JSONB)
5. **🎤 Voice Descriptions** - Natural language output for TTS

---

## 📋 Setup Instructions

### Step 1: Get Your Gemini API Key

1. Go to **[Google AI Studio](https://aistudio.google.com/app/apikey)**
2. Sign in with your Google account
3. Click **"Get API Key"** or **"Create API Key"**
4. Copy the API key (starts with `AIza...`)

**Important:** Gemini has a **FREE tier** with generous limits:
- 15 requests per minute
- 1,500 requests per day
- Perfect for testing and development!

---

### Step 2: Add API Key to .env File

1. Navigate to the `backend/` directory
2. Create or edit the `.env` file
3. Add your Gemini API key:

```bash
# AI API Keys
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Database (already configured)
DATABASE_URL=postgresql://postgres.aaepdorqqabhscowpidz:Transport%40IT%40121@aws-1-us-east-2.pooler.supabase.com:6543/postgres

# Server Config
PORT=3000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

**⚠️ IMPORTANT:** Never commit `.env` file to Git! It should already be in `.gitignore`.

---

### Step 3: Test the Integration

#### Option A: Test API Connection (Quick Check)

```bash
# Make sure backend is running
cd backend
npm start
```

Then in a browser or Postman:
```
GET http://localhost:3000/api/gemini-test/connection
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Gemini API is connected and working!",
  "response": "Hello from Gemini!"
}
```

#### Option B: Test Frame Analysis (Full Test)

You need a base64 image to test. Here's how:

1. Take any small image file
2. Convert to base64 (use online tool or Node.js)
3. Send POST request:

```bash
POST http://localhost:3000/api/gemini-test/analyze
Content-Type: application/json

{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**Expected Response:**
```json
{
  "success": true,
  "analysis": {
    "sceneDescription": "Indoor room with furniture...",
    "objects": [...],
    "obstacles": [...],
    "safetyLevel": "safe"
  }
}
```

---

## 🎮 How It Works (The Flow)

### Real-Time Analysis Pipeline:

```
1. 📸 Frontend captures frame every 5 seconds
         ↓
2. 📡 Sends base64 image via WebSocket
         ↓
3. 💾 Backend saves frame to local storage
         ↓
4. 🤖 Sends to Gemini AI for analysis
         ↓
5. 🎯 Gemini returns: scene, objects, obstacles
         ↓
6. 🚨 Critical obstacles? → Save to danger_alerts
         ↓
7. 💾 Store full analysis in session_frames (JSONB)
         ↓
8. 📡 Send analysis back to frontend
         ↓
9. 🎤 Frontend converts to speech
         ↓
10. 🔊 User hears: "Obstacle detected: chair 3 feet ahead"
```

---

## 📊 Database Changes

### session_frames Table:
Now stores rich AI analysis in JSONB format:

```sql
{
  "sceneDescription": "Indoor hallway with wooden floor",
  "environmentType": "indoor",
  "objects": [
    {"name": "chair", "position": "center-left", "distance": "3 feet"}
  ],
  "obstacles": [
    {
      "name": "chair",
      "position": "center",
      "distance": "3 feet",
      "urgency": "high",
      "action": "avoid left",
      "reason": "In direct path"
    }
  ],
  "safetyLevel": "caution",
  "warnings": ["Obstacle in path"],
  "navigationGuidance": "Move slightly to your right to avoid chair",
  "metadata": {
    "frameNumber": 5,
    "model": "gemini-2.0-flash-exp",
    "confidence": 0.85,
    "timestamp": "2025-10-25T10:30:00Z"
  }
}
```

### danger_alerts Table:
Automatically populated when critical obstacles detected:
- `alert_type`: "obstacle_detected"
- `severity`: "high" or "critical"
- `alert_data`: Full context + obstacles

---

## 🔍 Troubleshooting

### Error: "GEMINI_API_KEY not found"
**Fix:** Make sure `.env` file exists in `backend/` directory with your API key.

### Error: "API key not valid"
**Fix:** 
1. Check the key is correct (starts with `AIza`)
2. Make sure you copied the entire key
3. Try regenerating the key in Google AI Studio

### Error: "Rate limit exceeded"
**Fix:** Free tier limits:
- Wait 1 minute (15 requests/minute limit)
- Or upgrade to paid tier if needed

### Analysis returns "unknown"
**Fix:**
- Check image is valid base64
- Image should be JPEG format
- Try with a clearer image
- Check Gemini API status

---

## 🎯 Next Steps (Phase 4)

Phase 3 is complete when:
- ✅ Gemini API connected
- ✅ Frame analysis working
- ✅ Obstacles detected
- ✅ Data stored in database
- ✅ Frontend receives analysis via WebSocket

**Phase 4:** ChatGPT Integration
- Natural conversational responses
- User registration flow
- Context-aware descriptions
- Question answering

---

## 📝 Testing Checklist

- [ ] Test `/api/gemini-test/connection` endpoint
- [ ] Test `/api/gemini-test/analyze` with sample image
- [ ] Start "be my eye" mode in frontend
- [ ] Capture frames and check console logs
- [ ] Verify frames stored in database
- [ ] Check `session_frames` table has analysis data
- [ ] Test critical obstacle detection
- [ ] Verify `danger_alerts` table populated

---

## 🆘 Need Help?

**Common Issues:**
1. **No API key** → Follow Step 1 to get one
2. **Invalid key** → Regenerate in Google AI Studio
3. **Rate limits** → Use free tier wisely (15 req/min)
4. **Database errors** → Check Supabase connection

**Logs to Check:**
```bash
# Backend console will show:
🤖 Starting Gemini analysis...
✅ Gemini analysis complete
📊 Analysis Summary: ...
✅ DB synced with AI analysis
```

---

## 💡 Pro Tips

1. **Performance:** Gemini 2.0 Flash is the fastest model (~2-3 seconds)
2. **Quality:** Provide clear, well-lit images for best results
3. **Cost:** Free tier is generous - 1,500 requests/day
4. **Optimization:** Consider caching similar frames to reduce API calls

---

**Phase 3 Status:** ✅ READY TO TEST!

