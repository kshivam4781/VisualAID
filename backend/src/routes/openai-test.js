import express from 'express';
import { testOpenAIConnection } from '../services/openaiService.js';

export const router = express.Router();

// Test OpenAI API connection
router.get('/', async (req, res) => {
  try {
    console.log('🧪 Testing OpenAI API connection...');
    
    const result = await testOpenAIConnection();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'OpenAI API connected successfully!',
        response: result.message,
        model: 'gpt-4o'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'Failed to connect to OpenAI API. Check your API key in .env file.'
      });
    }
  } catch (error) {
    console.error('❌ OpenAI test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

