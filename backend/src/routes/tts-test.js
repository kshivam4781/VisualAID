import express from 'express';
import { testTTS, textToSpeech, VOICES } from '../services/openaiTTSService.js';

export const router = express.Router();

/**
 * Test OpenAI TTS connection
 * GET /api/tts-test
 */
router.get('/', async (req, res) => {
  try {
    console.log('🧪 Testing OpenAI TTS API...');
    
    const result = await testTTS();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'OpenAI TTS API is working!',
        audioSize: result.audioSize,
        availableVoices: VOICES
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'Failed to connect to OpenAI TTS API'
      });
    }
  } catch (error) {
    console.error('❌ TTS test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Generate speech from text
 * POST /api/tts-test/speak
 * Body: { text: "Hello world", voice: "alloy" }
 */
router.post('/speak', async (req, res) => {
  try {
    const { text, voice = 'alloy' } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }
    
    console.log(`🔊 Generating speech for: "${text.substring(0, 50)}..."`);
    
    const audioBuffer = await textToSpeech(text, { voice });
    
    // Send audio as MP3
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length
    });
    
    res.send(audioBuffer);
    
  } catch (error) {
    console.error('❌ TTS speak error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

