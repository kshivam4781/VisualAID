# OpenAI Realtime Migration & Voice Standardization

## Summary

The system has been updated to use **OpenAI Realtime API** for both voice input (listening) and output (speaking), replacing the Web Speech API and standardizing on the **nova voice** throughout the entire system.

## Changes Made

### 1. Voice Configuration (frontend/src/config/voice.ts)
- **Changed mode** from `'browser'` to `'openai-realtime'`
- **Standardized voice** from `'alloy'` to `'nova'`
- Enabled Realtime API by setting `enabled: true`

### 2. Realtime Service (backend/src/services/openaiRealtimeService.js)
- Updated default voice to `'nova'` in Realtime API configuration
- Voice is now consistently `'nova'` for all real-time conversations

### 3. TTS Service (backend/src/services/openaiTTSService.js)
- Modified `getVoiceForContext()` to always return `'nova'` regardless of context
- Previously used different voices for different contexts (greeting, navigation, alerts, descriptions)
- Now uses a single consistent voice: `'nova'`

### 4. TTS Routes (backend/src/routes/tts.js)
- Updated default voice from `'alloy'` to `'nova'` in both endpoints
- All TTS requests now default to nova voice unless explicitly specified

### 5. Voice Recognition (frontend/src/hooks/useVoiceRecognition.ts)
- **REMOVED Web Speech API** - No longer uses browser's `SpeechRecognition` API
- Now delegates to `useRealtimeAudio` hook which handles OpenAI Realtime for voice input
- Fixed the `grammars` property error by removing Web Speech API initialization
- Simplified to just manage state, actual voice recognition handled by OpenAI Realtime

### 6. Server Configuration (backend/src/server.js)
- Fixed import to use `GeminiConversationService` (Gemini is still used for backend conversation logic)
- Realtime API is used for voice-to-voice communication at the frontend level
- All TTS voice references in server.js already use `'nova'`

## Why OpenAI Realtime?

1. **Unified System**: We're using ChatGPT for image analysis, so using OpenAI Realtime for conversation keeps everything in the same ecosystem
2. **Natural Voice**: Nova voice provides a bright, energetic, and natural-sounding voice
3. **Consistency**: Using the same AI provider reduces complexity and potential conflicts
4. **Voice-to-Voice**: Realtime API enables direct voice-to-voice communication without the need for separate text-to-speech steps
5. **Better Recognition**: OpenAI's Whisper model (used by Realtime) provides better speech recognition than browser APIs

## Voice Selection: Nova

- **Nova** was chosen as the voice because it's:
  - Bright and energetic
  - Natural-sounding
  - Well-suited for an assistive technology application
  - Consistent and reliable

## Important Notes

1. **No More Web Speech API**: The system no longer uses the browser's `SpeechRecognition` API which was causing errors and compatibility issues
2. **OpenAI Realtime**: All voice input/output is now handled by OpenAI Realtime API via the `useRealtimeAudio` hook
3. **Gemini is Still Used**: Gemini conversation service is still used for backend conversation logic and text-based interactions
4. **Consistency**: The system now uses nova voice everywhere for a consistent user experience
5. **No More Mixed Voices**: Previously, different contexts used different voices. Now everything uses nova for consistency.

## How It Works Now

### Voice Input (Listening):
- User speaks into microphone
- Audio captured by `useRealtimeAudio` hook
- Sent to OpenAI Realtime API in real-time
- OpenAI's Whisper model transcribes speech
- Results sent back to frontend

### Voice Output (Speaking):
- AI generates response
- OpenAI Realtime API converts text to speech using nova voice
- Audio streamed back to frontend
- Played through browser speakers

## Testing

To test the changes:

1. Start the backend: `cd backend && npm start`
2. Start the frontend: `cd frontend && npm run dev`
3. Open the app in browser
4. The system will now use OpenAI Realtime API for ALL voice interactions (both listening and speaking)
5. All voice will use the nova voice

## Environment Variables

Ensure you have the OpenAI API key set in `backend/.env`:

```
OPENAI_API_KEY=sk-proj-xxxxx
```

This key is used for:
- Image analysis (ChatGPT Vision)
- Voice conversation (Realtime API) - both input and output
- Text-to-Speech (TTS API) - as fallback

## Bug Fixes

1. **Fixed `grammars` property error**: Removed the problematic Web Speech API initialization that was causing "Failed to set the 'grammars' property" error
2. **Unified voice recognition**: All voice input now goes through OpenAI Realtime instead of browser APIs
3. **Consistent voice**: Everything now uses nova voice for a consistent user experience
