# 🎤 OpenAI Realtime API Setup Guide

## Overview

VisualAID now supports **OpenAI Realtime API** for voice-to-voice communication! This replaces browser TTS with natural AI voice that can:

- 🎤 Listen to user speech directly
- 🗣️ Respond with natural AI voice
- 💬 Maintain conversation context
- 📸 Describe camera frames automatically
- 🚨 Alert about obstacles immediately
- ⚡ Ultra-low latency (~300ms)

---

## 🚀 Quick Start

### 1. Prerequisites

- ✅ OpenAI API Key with Realtime API access
- ✅ Node.js 18+ installed
- ✅ Microphone and speakers/headphones
- ✅ HTTPS or localhost (required for audio access)

### 2. Installation

Backend dependencies are already included (`ws` package).

### 3. Configuration

The Realtime API is **already configured** to use by default!

**To switch between modes:**

Edit `frontend/src/config/voice.ts`:

```typescript
export const voiceConfig: VoiceConfig = {
  // Switch between 'browser' and 'openai-realtime'
  mode: 'openai-realtime', // ✅ Using OpenAI Realtime API
  // mode: 'browser', // ❌ Use browser TTS (free but robotic)
  
  // ... rest of config
};
```

### 4. Environment Variables

Your OpenAI API key should already be set in `backend/.env`:

```bash
OPENAI_API_KEY=sk-proj-xxxxx
```

Make sure this key has **Realtime API** access (check your OpenAI dashboard).

---

## 🎯 How It Works

### Architecture

```
User speaks → Browser captures audio → Backend → OpenAI Realtime API
                                                           ↓
User hears AI voice ← Browser plays audio ← Backend ← AI responds
```

### Voice Flow

1. **User says "be my eye"**
   - Frontend starts Realtime session
   - Backend connects to OpenAI via WebSocket
   - Audio streaming begins

2. **Camera captures frame**
   - Backend analyzes frame (Gemini/ChatGPT)
   - Sends context to Realtime API
   - AI describes what it sees

3. **User asks questions**
   - "What's in front of me?"
   - "Tell me about that object"
   - AI responds with full context

4. **Critical obstacles detected**
   - Backend sends urgent alert
   - AI interrupts current response
   - Immediate warning to user

---

## 📡 WebSocket Events

### Backend → Frontend

```typescript
// Connection events
realtime:connected        // Session connected
realtime:disconnected     // Session disconnected
realtime:error            // Error occurred

// Audio events
realtime:audio_delta      // Audio chunk from AI
realtime:audio_done       // Audio response complete

// Transcript events
realtime:user_transcript  // What user said
realtime:ai_transcript    // What AI said (full)
realtime:ai_transcript_delta // AI speaking (streaming)
```

### Frontend → Backend

```typescript
// Session control
realtime:start           // Start session
realtime:stop            // Stop session

// Audio streaming
realtime:audio           // Send audio to AI

// Text fallback
realtime:message         // Send text message
```

---

## 🎨 UI Features

### Status Indicators

When "Be My Eye" mode is active with Realtime:

- ✅ **Connected** - Realtime API ready
- 🔴 **Recording** - Capturing your voice
- 🔊 **AI Speaking** - AI is responding
- 👤 **User Transcript** - Shows what you said
- 🤖 **AI Transcript** - Shows AI response

### Real-time Transcripts

```
👤 You: What do I see in front of me?
🤖 AI: You're in a hallway with a door 10 feet ahead. 
      The path is clear. You can walk forward safely.
```

---

## 💰 Pricing

**OpenAI Realtime API Costs:**

- **Input Audio:** ~$0.06 per minute
- **Output Audio:** ~$0.24 per minute
- **Total:** ~$0.30 per minute of conversation

**Example usage:**
- 10 minutes of navigation: ~$3
- 1 hour session: ~$18

**Cost-saving tips:**
- Use browser TTS for testing
- Enable Realtime only when needed
- Set up usage limits in OpenAI dashboard

---

## 🔧 Troubleshooting

### "Failed to connect to OpenAI Realtime API"

**Cause:** API key invalid or no Realtime access

**Fix:**
1. Check your OpenAI API key in `backend/.env`
2. Verify Realtime API access in OpenAI dashboard
3. Make sure key starts with `sk-proj-`

### "Microphone access denied"

**Cause:** Browser permissions not granted

**Fix:**
1. Click the 🎤 icon in browser address bar
2. Allow microphone access
3. Refresh the page

### No audio output

**Cause:** Audio context or playback issue

**Fix:**
1. Check browser console for errors
2. Verify speakers/headphones are working
3. Try in Chrome/Edge (best support)

### High latency / Slow responses

**Cause:** Network or API overload

**Fix:**
1. Check your internet connection
2. Try again during off-peak hours
3. Monitor OpenAI status page

### Audio cutting out

**Cause:** Packet loss or buffer issues

**Fix:**
1. Reduce background network usage
2. Use wired connection if possible
3. Close other audio apps

---

## 🧪 Testing

### Test Realtime Connection

1. Start backend: `cd backend && npm start`
2. Start frontend: `cd frontend && npm run dev`
3. Open browser console (F12)
4. Say "be my eye"
5. Look for:
   ```
   🎤 Starting OpenAI Realtime session...
   ✅ OpenAI Realtime API connected
   🔴 Recording
   ```

### Test Voice Interaction

1. Activate "be my eye" mode
2. Wait for camera to start
3. Ask: "What do you see?"
4. AI should respond with description
5. Check UI for transcripts

### Test Obstacle Detection

1. Point camera at obstacle
2. Move closer
3. AI should warn: "⚠️ ALERT! [obstacle] detected..."
4. Response should be immediate

---

## 🎛️ Configuration Options

### Voice Selection

Edit `frontend/src/config/voice.ts`:

```typescript
realtimeAPI: {
  voice: 'alloy', // Change this!
  // Options: 'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'
}
```

**Voice Personalities:**
- `alloy` - Balanced, natural (default)
- `echo` - Clear, professional
- `fable` - Warm, friendly
- `onyx` - Deep, authoritative
- `nova` - Bright, energetic
- `shimmer` - Soft, gentle

### Backend Session Config

Edit `backend/src/services/openaiRealtimeService.js`:

```javascript
// Line 70-85
this.sendSessionUpdate({
  voice: 'alloy', // Change voice
  temperature: 0.8, // 0.0 (focused) to 1.0 (creative)
  turn_detection: {
    threshold: 0.5, // Voice detection sensitivity
    silence_duration_ms: 500 // Wait time before responding
  }
});
```

---

## 📊 Feature Comparison

| Feature | Browser TTS | OpenAI Realtime |
|---------|------------|-----------------|
| **Voice Quality** | Robotic | Natural |
| **Latency** | 1-2s | 300ms |
| **Conversation** | One-way | Two-way |
| **Context** | Limited | Full |
| **Interruption** | No | Yes |
| **Cost** | Free | ~$0.30/min |
| **Offline** | Yes | No |

---

## 🔒 Security & Privacy

- Audio is encrypted in transit (WSS protocol)
- No audio is stored on backend
- OpenAI processes audio according to their privacy policy
- Session data stored in database (transcripts optional)

---

## 🚀 Next Steps

1. ✅ Test the Realtime API with "be my eye"
2. ⚙️ Adjust voice settings to your preference
3. 💰 Monitor your OpenAI usage
4. 📈 Provide feedback on response quality

---

## 📚 Additional Resources

- [OpenAI Realtime API Docs](https://platform.openai.com/docs/guides/realtime)
- [WebSocket API Reference](https://platform.openai.com/docs/api-reference/realtime)
- [Voice Samples](https://platform.openai.com/docs/guides/text-to-speech/voice-options)

---

## 🆘 Support

If you encounter issues:

1. Check browser console for errors
2. Check backend logs
3. Verify OpenAI API status
4. Review this troubleshooting guide
5. Contact support with error logs

---

**Status:** ✅ READY TO USE!

**Last Updated:** October 25, 2025

**Version:** 1.0.0

