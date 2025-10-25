# Frame Capture System - "Be My Eye" Feature

## 📊 Frame Capture Rate

### Current Settings:
- **Interval**: 15 seconds between frames
- **Rate**: 4 frames per minute
- **Per Hour**: ~240 frames
- **Per Session**: Unlimited (depends on session duration)

### Configuration:
To change the capture rate, edit `frontend/src/components/VoiceInterface.tsx`:
```typescript
intervalMs: 15000, // Change this value (in milliseconds)
```

**Recommended rates:**
- **Fast**: 5000ms (5 seconds) = 12 frames/min
- **Normal**: 15000ms (15 seconds) = 4 frames/min
- **Slow**: 30000ms (30 seconds) = 2 frames/min

## 💾 Local Storage

### Storage Location:
All captured frames are saved locally in:
```
backend/frames/
  └── [session-id]/
      ├── frame_1_2025-10-25T18-30-00-000Z.jpg
      ├── frame_2_2025-10-25T18-30-15-000Z.jpg
      ├── frame_3_2025-10-25T18-30-30-000Z.jpg
      └── ...
```

### File Naming Convention:
```
frame_[number]_[ISO-timestamp].jpg
```

Example: `frame_5_2025-10-25T18-30-45-000Z.jpg`

### Storage Benefits:
✅ **Fast** - No database delays  
✅ **Reliable** - Never lost due to connection issues  
✅ **Accessible** - Easy to view/process locally  
✅ **Organized** - Grouped by session ID  

## 🗄️ Database Storage

### What's Stored:
The database stores **metadata only** (not the full image):
- Session ID (UUID)
- User ID (if authenticated)
- Frame number (1, 2, 3...)
- File path (relative to frames directory)
- Metadata (dimensions, size, timestamp)
- Analysis results (Phase 3 - Gemini AI)
- Obstacles detected (Phase 3)
- Detection confidence (Phase 3)

### Non-Blocking Design:
- Frames are saved locally FIRST (fast, always succeeds)
- Database sync happens in the background
- If database fails, frames are still safe locally
- No user-facing errors from database timeouts

## 📈 How It Works

### 1. User Says "Be My Eye"
```
Frontend → Voice Recognition → Command Parser → Camera Activation
```

### 2. Frame Capture Starts
```
Every 15 seconds:
  Camera → Capture Frame → Convert to JPEG → Base64 Encode
```

### 3. Frame Storage
```
Frame Data → WebSocket → Backend
  ├── Save to Local File (backend/frames/[session-id]/frame_X.jpg)
  ├── Respond to Frontend (success)
  └── Sync to Database (background, non-blocking)
```

### 4. User Says "Stop Be My Eye"
```
Stop Frame Capture → End Session → Close WebSocket
```

## 📁 File Management

### Viewing Frames:
Navigate to: `backend/frames/[session-id]/`

All frames are standard JPEG files that can be opened with any image viewer.

### Cleanup:
To delete old frames, you can:

1. **Manual**: Delete session folders from `backend/frames/`
2. **Automatic** (future): Implement retention policy

### Storage Estimates:
- **Average frame size**: 5-10 KB (compressed JPEG)
- **Per hour**: ~1-2 MB (240 frames × 5-10 KB)
- **Per day**: ~24-48 MB (continuous capture)

## 🔍 Querying Frame Data

### Get All Frames for a Session:
```sql
SELECT session_id, frame_number, frame_url, timestamp
FROM session_frames
WHERE session_id = '[your-session-id]'
ORDER BY frame_number;
```

### Get Recent Frames:
```sql
SELECT * FROM session_frames
ORDER BY timestamp DESC
LIMIT 10;
```

### Count Frames Per Session:
```sql
SELECT session_id, COUNT(*) as frame_count
FROM session_frames
GROUP BY session_id;
```

## 🚀 Next Steps (Phase 3)

### Gemini AI Integration:
1. Send frames to Google Gemini Vision API
2. Get scene descriptions
3. Detect obstacles and hazards
4. Store analysis results in database
5. Provide real-time audio feedback

### ChatGPT Integration (Phase 4):
1. Convert Gemini analysis to natural language
2. Generate contextual responses
3. Provide navigation guidance
4. Answer user questions about surroundings

## ⚙️ Configuration

### Environment Variables:
```env
# Backend (.env)
PORT=3000
DATABASE_URL=postgresql://...
FRONTEND_URL=http://localhost:5173
```

### Frame Capture Settings:
```typescript
// frontend/src/components/VoiceInterface.tsx
intervalMs: 15000,    // Capture interval
quality: 0.7,         // JPEG quality (0.0-1.0)
maxWidth: 640,        // Max width (pixels)
maxHeight: 480,       // Max height (pixels)
format: 'jpeg',       // Image format
```

## 📝 Logs

### Backend Logs:
```
📸 Frame 1 - Session: 1d92d129..., Size: 6.43KB
💾 Saved locally: 1d92d129.../frame_1_2025-10-25T18-30-00-000Z.jpg
✅ DB synced: Frame 1
```

### Frontend Logs:
```
Frame captured: #1, Size: 6.43KB
Frame sent successfully: [frame-id]
```

## 🎯 Current Status

✅ **Frame capture working** - Every 15 seconds  
✅ **Local storage implemented** - Fast and reliable  
✅ **Database sync** - Non-blocking background sync  
✅ **WebSocket communication** - Real-time data transfer  
✅ **Session management** - Track active sessions  
✅ **Error handling** - Graceful degradation  

## 🐛 Troubleshooting

### Frames Not Capturing:
1. Check camera permissions
2. Verify WebSocket connection
3. Check backend logs for errors

### Database Sync Failing:
- **Not a problem!** Frames are saved locally
- Check Supabase connection
- Verify DATABASE_URL in .env

### Storage Full:
- Delete old session folders from `backend/frames/`
- Implement automatic cleanup
- Reduce capture frequency

---

**Last Updated**: October 25, 2025  
**Phase**: 2.2 Complete - Frame Capture & Storage  
**Next Phase**: 3.0 - Gemini AI Vision Analysis
