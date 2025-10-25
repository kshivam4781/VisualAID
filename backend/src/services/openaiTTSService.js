import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Initialize OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * 🔊 OpenAI Text-to-Speech Service
 * 
 * Simple, reliable TTS using OpenAI's proven API.
 * Converts text to natural-sounding speech.
 * 
 * Model: tts-1 (fast) or tts-1-hd (high quality)
 * Voices: alloy, echo, fable, onyx, nova, shimmer
 */

/**
 * 🎤 Convert text to speech using OpenAI TTS
 * 
 * @param {string} text - Text to convert to speech
 * @param {object} options - TTS options
 * @param {string} options.voice - Voice to use (default: 'alloy')
 * @param {string} options.model - Model to use (default: 'tts-1')
 * @param {number} options.speed - Speed 0.25 to 4.0 (default: 1.0)
 * @returns {Promise<Buffer>} Audio data as Buffer
 */
export async function textToSpeech(text, options = {}) {
  try {
    const voice = options.voice || 'alloy';
    const model = options.model || 'tts-1'; // 'tts-1' is faster, 'tts-1-hd' is higher quality
    const speed = options.speed || 1.0;

    console.log(`🔊 Converting text to speech (${voice})...`);
    console.log(`📝 Text: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);

    // Call OpenAI TTS API
    const mp3 = await openai.audio.speech.create({
      model: model,
      voice: voice,
      input: text,
      speed: speed,
      response_format: 'mp3' // or 'opus', 'aac', 'flac'
    });

    // Convert response to Buffer
    const buffer = Buffer.from(await mp3.arrayBuffer());

    console.log(`✅ TTS conversion complete: ${buffer.length} bytes`);

    return buffer;

  } catch (error) {
    console.error('❌ OpenAI TTS Error:', error.message);
    throw error;
  }
}

/**
 * 🎤 Convert text to speech and return as base64
 * 
 * @param {string} text - Text to convert
 * @param {object} options - TTS options
 * @returns {Promise<string>} Base64 encoded audio
 */
export async function textToSpeechBase64(text, options = {}) {
  try {
    const buffer = await textToSpeech(text, options);
    const base64 = buffer.toString('base64');
    
    console.log(`✅ TTS base64 encoded: ${base64.length} chars`);
    
    return base64;
  } catch (error) {
    console.error('❌ TTS Base64 Error:', error.message);
    throw error;
  }
}

/**
 * 🧪 Test OpenAI TTS API
 */
export async function testTTS() {
  try {
    console.log('🧪 Testing OpenAI TTS...');
    
    const testText = "Hello! I'm your AI assistant using OpenAI's natural voice. This sounds much better than robotic text-to-speech!";
    
    const audio = await textToSpeech(testText, { voice: 'alloy' });
    
    console.log('✅ TTS test successful!');
    console.log(`📊 Audio size: ${audio.length} bytes`);
    
    return { success: true, audioSize: audio.length };
  } catch (error) {
    console.error('❌ TTS test failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 📝 Available voices and their characteristics
 */
export const VOICES = {
  alloy: 'Balanced, neutral voice (recommended for general use)',
  echo: 'Clear, professional voice',
  fable: 'Warm, friendly voice',
  onyx: 'Deep, authoritative voice',
  nova: 'Bright, energetic voice',
  shimmer: 'Soft, gentle voice'
};

/**
 * ⚙️ Get voice configuration for VisualAID
 * 
 * Recommended voices for different scenarios:
 */
export const getVoiceForContext = (context) => {
  switch (context) {
    case 'greeting':
      return 'nova'; // Bright and welcoming
    case 'navigation':
      return 'alloy'; // Clear and neutral
    case 'alert':
      return 'onyx'; // Authoritative and urgent
    case 'description':
      return 'fable'; // Warm and descriptive
    default:
      return 'alloy'; // Default
  }
};

export default {
  textToSpeech,
  textToSpeechBase64,
  testTTS,
  VOICES,
  getVoiceForContext
};

