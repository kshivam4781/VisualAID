# 🚀 Phase 3 Quick Start Guide

## ✅ What's Done

Phase 3 is **fully implemented**! All code is in place and ready to test.

---

## 🔧 Setup (5 Minutes)

### Step 1: Get Your Gemini API Key (2 minutes)

1. Open [Google AI Studio](https://aistudio.google.com/app/apikey) in your browser
2. Sign in with your Google account
3. Click **"Get API Key"** or **"Create API Key"**
4. Copy the entire key (it starts with `AIza...`)

**Note:** Gemini offers a generous **FREE tier**:
- ✅ 15 requests per minute
- ✅ 1,500 requests per day  
- ✅ Perfect for development and testing!

---

### Step 2: Add API Key to .env File (1 minute)

1. Navigate to: `backend/.env`
2. Find the line: `GEMINI_API_KEY=your_gemini_api_key_here`
3. Replace `your_gemini_api_key_here` with your actual key
4. Save the file

**Example:**
```bash
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

### Step 3: Restart Backend (1 minute)

**If backend is already running:**
1. Stop it (Ctrl+C in the terminal)
2. Restart it:

```bash
cd backend
npm start
```

**If backend is not running:**
```bash
cd backend
npm install  # Only needed first time
npm start
```

You should see:
```
🚀 VisualAID Backend Server running on port 3000
📡 WebSocket server ready
✅ Database connection successful
```

---

### Step 4: Test Gemini Connection (30 seconds)

Open in your browser or use curl:

**Test 1: API Connection**
```
http://localhost:3000/api/gemini-test/connection
```

**Expected Success Response:**
```json
{
  "success": true,
  "message": "Gemini API is connected and working!",
  "response": "Hello from Gemini!"
}
```

**If you get an error**, check:
- ❌ API key is correct in `.env` file
- ❌ No extra spaces around the key
- ❌ Backend was restarted after adding the key

---

### Step 5: Test Full Integration (30 seconds)

**Option A: Use the App**
1. Start frontend: `cd frontend && npm run dev`
2. Open: `http://localhost:5173`
3. Say **"be my eye"**
4. Point camera at something
5. Wait ~15 seconds for first frame
6. AI will describe what it sees! 🎉

**Option B: Manual Frame Test**
1. Take a photo and convert to base64
2. Send POST request:
```bash
POST http://localhost:3000/api/gemini-test/analyze
Content-Type: application/json

{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

---

## 🎯 What to Expect

### Backend Console (While Running):

When frames are captured, you'll see:
```
📸 Frame 1 - Session: 3d4a561a..., Size: 45.23KB
💾 Saved locally: backend/frames/3d4a561a.../frame_1_...jpg
🤖 Starting Gemini analysis for frame 1...
✅ Gemini analysis complete
📊 Analysis Summary:
   - Scene: Indoor room with furniture visible
   - Objects detected: 3
   - Obstacles: 1
   - Safety level: caution
   - Confidence: 0.85
✅ DB synced with AI analysis: Frame 1
```

### Frontend (What User Hears):

**Normal Scene:**
> "Indoor hallway visible ahead. Clear path on your right."

**With Obstacle:**
> "Obstacle detected: chair 3 feet ahead in center. Move slightly to your right."

**Critical Danger:**
> "⚠️ ALERT! Stairs directly ahead 2 feet! Stop and turn around."

---

## 📊 Monitor Your Data

### Supabase Dashboard

1. Open [Supabase](https://supabase.com)
2. Go to your project
3. Click **"Table Editor"**

**Check `session_frames` table:**
- Should have new rows for each frame
- `analysis` column has rich JSONB data
- `obstacles` array shows detected obstacles
- `detection_confidence` shows AI confidence

**Check `danger_alerts` table:**
- Only populates when critical obstacles detected
- Shows severity and alert data

---

## 🔍 Troubleshooting

### "Route not found" error
**Fix:** Backend needs restart after code changes. Stop (Ctrl+C) and run `npm start` again.

### "GEMINI_API_KEY not found"
**Fix:** Make sure you edited `backend/.env` file (not `env.example`)

### "API key not valid"
**Fix:** 
- Check the key is correct (starts with `AIza`)
- No extra spaces or quotes
- Try regenerating in Google AI Studio

### No voice output
**Fix:** 
- Grant microphone permission in browser
- Make sure "be my eye" was activated
- Check browser console for errors

### Analysis taking too long
**Normal:** First analysis can take 3-5 seconds
**If > 10 seconds:** Check internet connection, Gemini API status

---

## 🎉 Success Indicators

✅ **Backend Console:**
- ✅ "Gemini analysis complete" messages
- ✅ "DB synced with AI analysis" messages
- ✅ No red error messages

✅ **Frontend:**
- ✅ User hears scene descriptions
- ✅ Obstacles are announced
- ✅ No "failed to analyze" errors

✅ **Database:**
- ✅ `session_frames.analysis` has detailed JSONB
- ✅ `session_frames.obstacles` has obstacle arrays
- ✅ `danger_alerts` populates for critical situations

---

## 📚 Documentation

- **Full Setup:** `backend/PHASE_3_SETUP.md`
- **Implementation Details:** `PHASE_3_COMPLETE.md`
- **Code:** `backend/src/services/geminiService.js`

---

## 🚀 Next: Phase 4

Once Phase 3 is working, you can move to:

**Phase 4: ChatGPT Integration**
- Conversational AI responses
- User registration flow
- Natural dialogue
- Question answering

**Estimated Time:** 4-5 days

---

**Need Help?** Check the troubleshooting section or review the detailed setup guide in `backend/PHASE_3_SETUP.md`.

**Ready to test?** Just restart your backend and visit the test endpoint! 🎊

