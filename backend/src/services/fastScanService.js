import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * ⚡ FAST SCAN SERVICE
 * 
 * Ultra-fast danger detection (0.5-1 second response)
 * Provides immediate feedback while full analysis happens in background
 * 
 * Uses GPT-4o-mini for speed (cheaper + 2-3x faster than GPT-4o)
 */

/**
 * ⚡ Quick danger scan - Returns immediately with critical info
 * @param {string} base64Image - Base64 encoded image
 * @param {object} metadata - Frame metadata
 * @returns {Promise<object>} Quick scan results
 */
export async function quickDangerScan(base64Image, metadata = {}) {
  try {
    const startTime = Date.now();
    console.log(`⚡ FAST SCAN started for frame ${metadata.captureCount || 'unknown'}...`);

    // Ensure proper data URL format
    let imageUrl = base64Image;
    if (!base64Image.startsWith('data:image')) {
      imageUrl = `data:image/jpeg;base64,${base64Image}`;
    }

    // Ultra-focused prompt for speed
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Faster, cheaper model for quick scans
      messages: [
        {
          role: 'system',
          content: 'You are a safety assistant for visually impaired users. Respond ONLY with critical safety information in 1-2 sentences. Be EXTREMELY concise.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Quick safety scan: Are there any IMMEDIATE dangers or obstacles in the path? (stairs, drop-offs, moving vehicles, obstacles within 5 feet). If path is clear, say "Path clear". If danger, say what and where in 5 words or less. ONLY safety-critical info.`
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'low' // Low detail = faster processing
              }
            }
          ]
        }
      ],
      max_tokens: 50, // Very short response for speed
      temperature: 0.3 // Lower temperature for consistent safety responses
    });

    const quickResponse = response.choices[0].message.content.trim();
    const duration = Date.now() - startTime;

    console.log(`⚡ FAST SCAN completed in ${duration}ms: "${quickResponse}"`);

    // Parse quick response
    const hasDanger = !quickResponse.toLowerCase().includes('clear') && 
                      !quickResponse.toLowerCase().includes('safe');

    return {
      quickResponse,
      hasDanger,
      duration,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Fast scan error:', error);
    return {
      quickResponse: 'Scanning environment...',
      hasDanger: false,
      error: error.message,
      duration: 0
    };
  }
}

/**
 * 🎯 Smart acknowledgement - Returns immediate contextual response
 * @param {number} frameCount - Current frame number
 * @param {string} lastEnvironment - Last known environment type
 * @returns {string} Immediate acknowledgement message
 */
export function getImmediateAck(frameCount, lastEnvironment = null) {
  // Vary responses to keep it natural
  const firstFrameAcks = [
    "Looking around...",
    "Scanning your surroundings...",
    "Let me see what's here..."
  ];

  const subsequentAcks = [
    "Checking ahead...",
    "Scanning for changes...",
    "Looking for updates...",
    "Observing..."
  ];

  const acks = frameCount === 1 ? firstFrameAcks : subsequentAcks;
  return acks[Math.floor(Math.random() * acks.length)];
}

/**
 * 💬 Generate streaming-ready response chunks
 * Breaks down analysis into speakable chunks for real-time delivery
 */
export function generateStreamingChunks(analysis) {
  const chunks = [];

  // Chunk 1: Environment (immediate)
  if (analysis.sceneDescription) {
    const envSummary = analysis.sceneDescription.split('.')[0] + '.';
    chunks.push({
      priority: 1,
      text: envSummary,
      type: 'environment'
    });
  }

  // Chunk 2: Dangers (high priority)
  if (analysis.obstacles && analysis.obstacles.length > 0) {
    const dangerObstacles = analysis.obstacles.filter(o => 
      o.urgency === 'high' || o.urgency === 'critical'
    );
    if (dangerObstacles.length > 0) {
      const dangerText = dangerObstacles
        .map(o => `${o.name} ${o.distance} ahead ${o.position}`)
        .join(', ');
      chunks.push({
        priority: 2,
        text: `Watch out: ${dangerText}.`,
        type: 'danger'
      });
    }
  }

  // Chunk 3: Path status (medium priority)
  if (analysis.pathStatus) {
    chunks.push({
      priority: 3,
      text: `Path is ${analysis.pathStatus}.`,
      type: 'navigation'
    });
  }

  // Chunk 4: Details (low priority)
  if (analysis.relevantObjects && analysis.relevantObjects.length > 0) {
    const objectList = analysis.relevantObjects
      .slice(0, 3) // Only top 3 objects
      .map(o => o.name)
      .join(', ');
    chunks.push({
      priority: 4,
      text: `I can see ${objectList}.`,
      type: 'details'
    });
  }

  return chunks.sort((a, b) => a.priority - b.priority);
}

export default {
  quickDangerScan,
  getImmediateAck,
  generateStreamingChunks
};


