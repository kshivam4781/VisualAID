import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 💾 RESPONSE CACHE SERVICE
 * 
 * Caches common AI responses to reduce API calls and improve speed
 * Useful for frequently occurring scenarios
 */

// In-memory cache for common scenarios
const responseCache = new Map();

// Cache statistics
const cacheStats = {
  hits: 0,
  misses: 0,
  saves: 0
};

/**
 * 🔑 Generate cache key from frame analysis
 */
function generateCacheKey(analysis) {
  if (!analysis) return null;
  
  // Create a simplified fingerprint of the scene
  const key = {
    environment: analysis.environmentType || 'unknown',
    pathStatus: analysis.pathStatus || 'unknown',
    obstacleCount: (analysis.obstacles || []).length,
    hasCritical: (analysis.obstacles || []).some(o => o.urgency === 'critical'),
    hasHigh: (analysis.obstacles || []).some(o => o.urgency === 'high')
  };
  
  return JSON.stringify(key);
}

/**
 * 🔍 Check if response is cached
 */
export function getCachedResponse(analysis) {
  const key = generateCacheKey(analysis);
  if (!key) return null;
  
  const cached = responseCache.get(key);
  if (cached) {
    cacheStats.hits++;
    console.log(`💾 Cache HIT (${cacheStats.hits} hits / ${cacheStats.misses} misses)`);
    return cached;
  }
  
  cacheStats.misses++;
  return null;
}

/**
 * 💾 Cache a response for future use
 */
export function cacheResponse(analysis, response) {
  const key = generateCacheKey(analysis);
  if (!key) return;
  
  // Don't cache if there are critical/high urgency obstacles (situations change too fast)
  if (analysis.obstacles && analysis.obstacles.some(o => o.urgency === 'critical' || o.urgency === 'high')) {
    return;
  }
  
  // Cache with timestamp and TTL (5 minutes)
  responseCache.set(key, {
    response,
    timestamp: Date.now(),
    ttl: 5 * 60 * 1000 // 5 minutes
  });
  
  cacheStats.saves++;
  console.log(`💾 Cached response for key: ${key.substring(0, 50)}... (${responseCache.size} total)`);
}

/**
 * 🧹 Clean expired cache entries
 */
export function cleanExpiredCache() {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, value] of responseCache.entries()) {
    if (now - value.timestamp > value.ttl) {
      responseCache.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
  }
  
  return cleaned;
}

/**
 * 📊 Get cache statistics
 */
export function getCacheStats() {
  return {
    ...cacheStats,
    size: responseCache.size,
    hitRate: cacheStats.hits + cacheStats.misses > 0 
      ? (cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100).toFixed(1) + '%'
      : '0%'
  };
}

/**
 * 🗑️ Clear entire cache
 */
export function clearCache() {
  const size = responseCache.size;
  responseCache.clear();
  console.log(`🗑️ Cleared ${size} cached responses`);
  return size;
}

/**
 * 🎯 Pre-populate cache with common scenarios
 */
export function initializeCommonScenarios() {
  console.log('🎯 Initializing cache with common scenarios...');
  
  const commonScenarios = [
    {
      key: {
        environment: 'hallway',
        pathStatus: 'clear',
        obstacleCount: 0,
        hasCritical: false,
        hasHigh: false
      },
      response: {
        quickResponse: 'Path clear',
        voiceDescription: 'The hallway ahead looks clear. You can continue forward safely.'
      }
    },
    {
      key: {
        environment: 'room',
        pathStatus: 'clear',
        obstacleCount: 0,
        hasCritical: false,
        hasHigh: false
      },
      response: {
        quickResponse: 'Room clear',
        voiceDescription: 'The room is clear. No obstacles detected in your immediate path.'
      }
    },
    {
      key: {
        environment: 'outdoor',
        pathStatus: 'clear',
        obstacleCount: 0,
        hasCritical: false,
        hasHigh: false
      },
      response: {
        quickResponse: 'Path clear',
        voiceDescription: 'The path ahead is clear. You can move forward safely.'
      }
    }
  ];
  
  commonScenarios.forEach(scenario => {
    const key = JSON.stringify(scenario.key);
    responseCache.set(key, {
      response: scenario.response,
      timestamp: Date.now(),
      ttl: 60 * 60 * 1000 // 1 hour for pre-populated scenarios
    });
  });
  
  console.log(`✅ Initialized ${commonScenarios.length} common scenarios`);
}

// Clean cache every 5 minutes
setInterval(() => {
  cleanExpiredCache();
}, 5 * 60 * 1000);

export default {
  getCachedResponse,
  cacheResponse,
  cleanExpiredCache,
  getCacheStats,
  clearCache,
  initializeCommonScenarios
};

