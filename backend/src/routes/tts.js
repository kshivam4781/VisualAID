import express from 'express';
import { textToSpeech, getVoiceForContext } from '../services/openaiTTSService.js';

export const router = express.Router();

/**
 * Generate speech for any text
 * POST /api/tts
 * Body: { 
 *   text: "Text to speak", 
 *   voice: "alloy" (optional),
 *   context: "greeting" | "navigation" | "alert" | "description" (optional)
 * }
 * Returns: Audio buffer (MP3)
 */
router.post('/', async (req, res) => {
  try {
    const { text, voice, context, speed = 1.0 } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }
    
    // Select voice based on context or use specified voice
    const selectedVoice = voice || (context ? getVoiceForContext(context) : 'alloy');
    
    console.log(`🔊 TTS Request: "${text.substring(0, 50)}..." (voice: ${selectedVoice})`);
    
    // Generate audio
    const audioBuffer = await textToSpeech(text, { 
      voice: selectedVoice,
      speed: speed,
      model: 'tts-1' // Fast model for real-time
    });
    
    // Send audio as MP3
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    });
    
    res.send(audioBuffer);
    
  } catch (error) {
    console.error('❌ TTS error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get TTS audio as base64 (for WebSocket compatibility)
 * POST /api/tts/base64
 */
router.post('/base64', async (req, res) => {
  try {
    const { text, voice, context, speed = 1.0 } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }
    
    const selectedVoice = voice || (context ? getVoiceForContext(context) : 'alloy');
    
    console.log(`🔊 TTS Base64 Request: "${text.substring(0, 50)}..." (voice: ${selectedVoice})`);
    
    const audioBuffer = await textToSpeech(text, { 
      voice: selectedVoice,
      speed: speed,
      model: 'tts-1'
    });
    
    const base64 = audioBuffer.toString('base64');
    
    res.json({
      success: true,
      audio: base64,
      format: 'mp3',
      voice: selectedVoice
    });
    
  } catch (error) {
    console.error('❌ TTS Base64 error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

