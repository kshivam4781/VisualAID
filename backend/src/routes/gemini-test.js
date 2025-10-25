import express from 'express';
import { testGeminiConnection, analyzeFrame } from '../services/geminiService.js';

export const router = express.Router();

/**
 * 🧪 Test Gemini API Connection
 * GET /api/gemini-test/connection
 */
router.get('/connection', async (req, res) => {
  try {
    const result = await testGeminiConnection();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Gemini API is connected and working!',
        response: result.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'Failed to connect to Gemini API. Check your GEMINI_API_KEY in .env file.'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 🧪 Test Frame Analysis (with sample image)
 * POST /api/gemini-test/analyze
 * 
 * Body: { "image": "base64-encoded-image" }
 */
router.post('/analyze', async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({
        success: false,
        error: 'No image provided. Send base64 image in request body.'
      });
    }
    
    console.log('🧪 Testing frame analysis...');
    
    const analysis = await analyzeFrame(image, { 
      captureCount: 1,
      test: true 
    });
    
    res.json({
      success: true,
      analysis: analysis,
      message: 'Frame analyzed successfully!'
    });
    
  } catch (error) {
    console.error('Test analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

