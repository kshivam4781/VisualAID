import express from 'express';
import * as ResponseCache from '../services/responseCacheService.js';

export const router = express.Router();

/**
 * 📊 GET /api/cache/stats
 * Get cache statistics
 */
router.get('/stats', (req, res) => {
  try {
    const stats = ResponseCache.getCacheStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 🧹 POST /api/cache/clean
 * Clean expired cache entries
 */
router.post('/clean', (req, res) => {
  try {
    const cleaned = ResponseCache.cleanExpiredCache();
    res.json({
      success: true,
      cleaned,
      message: `Cleaned ${cleaned} expired entries`
    });
  } catch (error) {
    console.error('Error cleaning cache:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 🗑️ POST /api/cache/clear
 * Clear entire cache
 */
router.post('/clear', (req, res) => {
  try {
    const cleared = ResponseCache.clearCache();
    res.json({
      success: true,
      cleared,
      message: `Cleared ${cleared} cached responses`
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 🎯 POST /api/cache/init
 * Re-initialize cache with common scenarios
 */
router.post('/init', (req, res) => {
  try {
    ResponseCache.clearCache();
    ResponseCache.initializeCommonScenarios();
    const stats = ResponseCache.getCacheStats();
    res.json({
      success: true,
      message: 'Cache re-initialized',
      stats
    });
  } catch (error) {
    console.error('Error initializing cache:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

