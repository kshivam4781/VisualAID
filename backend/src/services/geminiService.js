import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use Gemini 2.0 Flash for fast vision analysis
// This is the fastest vision model - perfect for real-time frame analysis
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

/**
 * 🎯 CORE FUNCTION: Analyze a captured frame
 * 
 * This function takes a base64 image and returns:
 * - Description of the scene
 * - Objects detected
 * - Obstacles with urgency levels
 * - Safety alerts
 * 
 * @param {string} base64Image - Base64 encoded image data (with or without data:image prefix)
 * @param {object} metadata - Additional context (frame number, session info, etc.)
 * @param {object} previousAnalysis - Previous frame analysis for comparison (optional)
 * @returns {Promise<object>} Analysis results
 */
export async function analyzeFrame(base64Image, metadata = {}, previousAnalysis = null) {
  try {
    console.log(`🤖 Starting Gemini analysis for frame ${metadata.captureCount || 'unknown'}...`);

    // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
    const base64Data = base64Image.includes(',') 
      ? base64Image.split(',')[1] 
      : base64Image;

    // Determine if this is the first frame or a subsequent frame
    const isFirstFrame = !previousAnalysis || metadata.captureCount === 1;
    
    console.log(`🎯 Frame Mode: ${isFirstFrame ? 'FIRST FRAME (Full Context)' : 'SUBSEQUENT FRAME (Changes Only)'}`);
    
    // Prepare the prompt - different for first frame vs subsequent frames
    let prompt;
    
    if (isFirstFrame) {
      // FIRST FRAME: Full contextual description with conversational tone
      prompt = `You are a friendly, intelligent visual assistance AI helping a visually impaired person. This is their FIRST view of the scene.

PROVIDE A COMPLETE, CONTEXTUAL DESCRIPTION:

1. MAIN SCENE UNDERSTANDING:
   - What type of environment is this? (library, office, classroom, home, outdoor space, event venue, etc.)
   - What's the overall atmosphere and purpose of this space?
   - Focus on what's RELEVANT to the user

2. WHAT THE USER IS DOING/WEARING (if visible):
   - Are they carrying anything? (backpack, bag, books, water bottle)
   - What might they be doing here? (studying, working, attending event, traveling)
   - Be conversational and curious

3. IMPORTANT OBJECTS IN VIEW:
   - What's directly ahead and around them?
   - What's close enough to matter? (within 10-15 feet)
   - DON'T describe everything behind them or far away
   - Focus on navigation-relevant items

4. IMMEDIATE OBSTACLES (CRITICAL - People are obstacles!):
   - **ANY PEOPLE directly in front of/in the camera view are OBSTACLES** - they block the path and must be reported
   - Any objects or furniture in the direct path (within 5 feet)
   - Trip hazards, low objects, head-height dangers
   - If there's a person sitting/standing in front of the camera, they are an URGENT obstacle, not environmental context
   - If path is truly clear (no people or objects), say so!

5. FOCUSED OBJECT DETECTION (Important for detailed descriptions):
   - **Is there ONE main object/person taking up 30% or more of the frame?**
   - If YES (30%+ coverage), analyze it in DETAIL:
   
   **FOR PEOPLE (50%+ coverage):**
     * Clothing and appearance (hair color, clothing color/type, approximate age if visible)
     * **Body language and posture** (sitting/standing, arms crossed, leaning forward, relaxed, tense)
     * **Facial expression** if visible (smiling, frowning, neutral, surprised, concerned, happy)
     * **Emotions** inferred from expression/body language (happy, sad, angry, surprised, calm, anxious, tired, engaged, distracted)
     * **Actions/Intentions** (reading, writing, typing, talking, listening, waiting, looking at phone, looking at you, eating, working)
     * **Eye contact** (looking at camera/you, looking away, focused elsewhere)
     * Describe what they seem to be doing and their apparent emotional state
   
   **FOR NON-PEOPLE OBJECTS (30%+ coverage):**
     * Read any visible text (full transcription)
     * Describe images, graphics, or visual content shown
     * Explain what this object is and its context
     * If it's a screen, describe what's displayed
     * If it's a sign/poster/document, read all visible text
   
   This is CRITICAL for understanding what's directly in front of the user!

6. CONVERSATIONAL CONTEXT:
   - Ask a friendly question about their situation
   - "Looks like you're in a library, are you here to study?"
   - "I see you have a backpack and books, heading to class?"
   - Make it natural and helpful

Return ONLY valid JSON:
{
  "sceneDescription": "Natural, conversational description of the environment and context",
  "environmentType": "library/classroom/office/home/outdoor/event/store/etc",
  "userContext": "What the user appears to be doing or carrying",
  "focusedObject": {
    "detected": true/false,
    "type": "person/object",
    "name": "main object/person in frame (e.g., 'person', 'computer screen', 'book')",
    "coveragePercentage": "estimated % of frame (e.g., 60%, 80%)",
    "text": "any visible text to read (full transcription if possible - for objects only)",
    "description": "detailed description of what's shown/written/displayed OR person's appearance/clothing",
    "context": "what this object/person is and why user might be looking at it",
    "facialExpression": "if person, describe: smiling/frowning/neutral/surprised/concerned/etc.",
    "emotion": "if person, inferred emotion: happy/sad/angry/surprised/calm/anxious/tired/engaged/distracted",
    "bodyLanguage": "if person, posture and stance: sitting/standing/arms crossed/leaning/relaxed/tense",
    "actions": "if person, what they're doing: reading/writing/typing/talking/listening/waiting/looking at phone/looking at camera/eating/working",
    "eyeContact": "if person, where are they looking: at camera/at you/away/focused elsewhere"
  },
  "relevantObjects": [
    {
      "name": "object name",
      "position": "position relative to user",
      "distance": "distance in feet",
      "relevance": "why this matters for navigation"
    }
  ],
  "obstacles": [
    {
      "name": "obstacle name (if person, say 'person' or 'someone')",
      "position": "left/center/right",
      "distance": "distance in feet",
      "urgency": "low/medium/high/critical (people are usually 'critical' or 'high')",
      "action": "what to do (e.g., 'There's someone directly in front' or 'person blocking the path')"
    }
  ],
  "pathStatus": "clear/caution/blocked (if someone is sitting/standing in front, status must be 'blocked')",
  "conversationalQuestion": "Friendly question about their context",
  "navigationGuidance": "Simple, friendly instruction"
}

BE CONVERSATIONAL. Focus on CONTEXT and RELEVANCE, not exhaustive lists.`;
    } else {
      // SUBSEQUENT FRAMES: Only describe CHANGES and obstacles
      prompt = `You are a visual assistance AI. This is frame #${metadata.captureCount} of an ongoing session.

PREVIOUS FRAME CONTEXT:
${JSON.stringify(previousAnalysis, null, 2)}

NOW ANALYZE ONLY WHAT'S CHANGED:

1. WHAT'S DIFFERENT?
   - New objects that appeared
   - Objects that moved or disappeared  
   - Changes in the environment
   - If NOTHING changed significantly, say so!

2. MOTION DETECTION (CRITICAL - Compare with previous frame):
   - Did any objects MOVE between frames?
   - People who were stationary now walking? Or vice versa?
   - Vehicles that changed position?
   - Objects getting CLOSER or moving AWAY?
   - Direction and speed of movement
   - **This is the PRIMARY way to detect motion - compare positions!**

3. WHO IS MOVING? (User vs Objects - VERY IMPORTANT):
   **Analyze these visual cues to determine who is actually moving:**
   
   A. USER IS MOVING (camera/user is in motion):
      - Background objects shifting position (ALL objects move together in same direction)
      - Camera shake or motion blur across ENTIRE image
      - Parallax effect: closer objects move faster than distant objects
      - Everything in scene shifts left/right/up/down together
      - Building/walls/floor appearing to move
      → If detected, report: "userMoving: true" and describe direction
   
   B. OBJECTS ARE MOVING (user is stationary):
      - ONLY specific objects change position (person, car, door)
      - Background remains stable
      - Motion blur ONLY on the moving object
      - Other objects stay in same relative positions
      → If detected, report in "movingObjects" array
   
   C. BOTH MOVING:
      - User is walking AND person/car is also moving
      - Background shifting + specific object moving differently than background
      → Report both "userMoving: true" AND "movingObjects"

4. **IMPORTANT CONTEXT-BASED BEHAVIOR:**
   
   A. **IF USER IS NOT MOVING (stationary):**
      - DO NOT provide navigation instructions (no "keep walking", "clear path", etc.)
      - FOCUS on what they're looking at:
        * **Is there a main object/person taking up 30% or more of the frame?**
        * **FOR PEOPLE (50%+ coverage):** Analyze in detail:
          - Clothing and appearance (hair, clothing color/type, approximate age if visible)
          - Facial expression (smiling/frowning/neutral/surprised/concerned/happy)
          - Body language (sitting/standing/arms crossed/leaning/relaxed/tense)
          - Emotions inferred (happy/sad/angry/surprised/calm/anxious/tired/engaged/distracted)
          - Actions/Intentions (reading/writing/typing/talking/listening/waiting/looking at phone/looking at you/eating/working)
          - Eye contact (looking at camera/you, looking away, focused elsewhere)
        * **FOR OBJECTS (30%+ coverage):**
          - Read any text (full transcription)
          - Describe images/graphics/content
          - If screen → describe what's displayed
          - If sign/post/document → read all visible text
      - STILL ALERT about approaching dangers:
        * If someone/something is moving TOWARDS them → ALWAYS alert!
        * "Person walking towards you from the right"
        * "Car approaching from your left"
        * "Someone coming closer, currently 10 feet away"
      - Be descriptive and informative about stationary content
   
   B. **IF USER IS MOVING:**
      - Provide navigation instructions as normal
      - Alert about obstacles and path status
      - Warn about any moving objects that might collide
      - Give directional guidance

5. OBSTACLES & PROXIMITY ALERTS:
   - **ALWAYS check if objects/people are getting CLOSER**
   - Compare distances between frames
   - If something moved from 15ft → 10ft → ALERT: "approaching"
   - If someone is walking towards the stationary user → HIGH PRIORITY ALERT
   - Even if user isn't moving, they need to know about approaching hazards

Return ONLY valid JSON:
{
  "changes": "Brief description of what changed (or 'No significant changes')",
  "userMoving": {
    "isMoving": true/false,
    "direction": "forward/backward/turning left/turning right/looking around/panning/stationary",
    "speed": "slow/moderate/fast",
    "indication": "what suggests user is moving (e.g., 'background shifting left', 'parallax effect visible', 'entire scene moving right', 'stationary - no camera movement')"
  },
  "focusedObject": {
    "detected": true/false,
    "type": "person/object",
    "name": "main object/person in frame (e.g., 'person', 'computer screen', 'book')",
    "coveragePercentage": "estimated % of frame (e.g., 60%, 80%)",
    "text": "any visible text to read (full transcription if possible - for objects only)",
    "description": "detailed description of what's shown/written/displayed OR person's appearance/clothing",
    "context": "what this object/person is and why user might be looking at it",
    "facialExpression": "if person, describe: smiling/frowning/neutral/surprised/concerned/etc.",
    "emotion": "if person, inferred emotion: happy/sad/angry/surprised/calm/anxious/tired/engaged/distracted",
    "bodyLanguage": "if person, posture and stance: sitting/standing/arms crossed/leaning/relaxed/tense",
    "actions": "if person, what they're doing: reading/writing/typing/talking/listening/waiting/looking at phone/looking at camera/eating/working",
    "eyeContact": "if person, where are they looking: at camera/at you/away/focused elsewhere"
  },
  "newObjects": [
    {
      "name": "new object",
      "position": "position",
      "distance": "distance"
    }
  ],
  "movingObjects": [
    {
      "name": "what is moving (person, car, bicycle, door, etc.)",
      "direction": "towards user/away from user/left to right/right to left/approaching/receding",
      "speed": "slow/moderate/fast",
      "distance": "current distance in feet",
      "previousDistance": "distance in previous frame (if known)",
      "isApproaching": true/false,
      "safetyLevel": "safe/caution/danger",
      "alert": "urgent message if dangerous or approaching (e.g., 'Car approaching from left!', 'Person walking towards you')"
    }
  ],
  "obstacles": [
    {
      "name": "obstacle name",
      "position": "left/center/right", 
      "distance": "distance in feet",
      "urgency": "low/medium/high/critical",
      "action": "what to do"
    }
  ],
  "pathStatus": "clear/caution/blocked",
  "navigationGuidance": "ONLY provide if user is moving. If stationary, leave empty or describe what they're looking at. If approaching danger detected, always alert regardless of user movement."
}

BE BRIEF. Only mention CHANGES and OBSTACLES. Don't repeat what they already know. 
**Remember: If user is NOT moving, focus on WHAT they're looking at, not WHERE to walk.**`;
    }
    
    // Send to Gemini for analysis using the appropriate prompt
    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: "image/jpeg"
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    console.log(`✅ Gemini analysis complete`);
    console.log(`📝 Raw Gemini response (first 500 chars):`, text.substring(0, 500));

    // Parse the JSON response
    let analysis;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
      analysis = JSON.parse(jsonText);
    } catch (parseError) {
      console.warn('⚠️  Failed to parse JSON, using raw text response');
      // Fallback: create a basic structure from the text
      analysis = {
        sceneDescription: text.substring(0, 200),
        environmentType: "unknown",
        objects: [],
        obstacles: [],
        safetyLevel: "unknown",
        warnings: [],
        navigationGuidance: text.substring(0, 100),
        rawResponse: text
      };
    }

    // Calculate confidence score based on response quality
    const confidence = calculateConfidence(analysis);

    // Add metadata
    const enrichedAnalysis = {
      ...analysis,
      metadata: {
        frameNumber: metadata.captureCount,
        timestamp: new Date().toISOString(),
        model: "gemini-2.0-flash-exp",
        confidence: confidence,
        processingTime: metadata.processingTime || null
      }
    };

    // Log summary
    console.log(`📊 Analysis Summary:`);
    console.log(`   - Scene: ${analysis.sceneDescription?.substring(0, 50)}...`);
    console.log(`   - Objects detected: ${analysis.objects?.length || 0}`);
    console.log(`   - Obstacles: ${analysis.obstacles?.length || 0}`);
    console.log(`   - Safety level: ${analysis.safetyLevel}`);
    console.log(`   - Confidence: ${confidence.toFixed(2)}`);

    return enrichedAnalysis;

  } catch (error) {
    console.error('❌ Gemini API Error:', error.message);
    
    // Return a safe error response so the app doesn't crash
    return {
      error: true,
      errorMessage: error.message,
      sceneDescription: "Unable to analyze frame at this time",
      environmentType: "unknown",
      objects: [],
      obstacles: [],
      safetyLevel: "unknown",
      warnings: ["Vision analysis temporarily unavailable"],
      navigationGuidance: "Please proceed with caution",
      metadata: {
        frameNumber: metadata.captureCount,
        timestamp: new Date().toISOString(),
        error: true
      }
    };
  }
}

/**
 * 📊 Calculate confidence score for the analysis
 * 
 * Higher score = more detailed and useful analysis
 * Based on: number of objects, obstacles detected, description quality
 */
function calculateConfidence(analysis) {
  let score = 0.5; // Base score

  // Add points for detailed description
  if (analysis.sceneDescription && analysis.sceneDescription.length > 20) {
    score += 0.1;
  }

  // Add points for objects detected
  if (analysis.objects && analysis.objects.length > 0) {
    score += Math.min(0.2, analysis.objects.length * 0.05);
  }

  // Add points for obstacle detection
  if (analysis.obstacles && analysis.obstacles.length > 0) {
    score += 0.1;
  }

  // Add points for safety assessment
  if (analysis.safetyLevel && analysis.safetyLevel !== 'unknown') {
    score += 0.1;
  }

  return Math.min(1.0, score); // Cap at 1.0
}

/**
 * 🚨 Detect dangerous situations and prioritize them
 * 
 * This function analyzes obstacles and returns those that need
 * immediate attention (high/critical urgency)
 * 
 * @param {object} analysis - The full Gemini analysis
 * @returns {array} Array of critical obstacles
 */
export function detectCriticalObstacles(analysis) {
  if (!analysis.obstacles || analysis.obstacles.length === 0) {
    return [];
  }

  // Filter for high-priority obstacles
  const criticalObstacles = analysis.obstacles.filter(obstacle => {
    const urgency = obstacle.urgency?.toLowerCase();
    return urgency === 'high' || urgency === 'critical';
  });

  // Sort by urgency (critical first, then high)
  criticalObstacles.sort((a, b) => {
    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return urgencyOrder[a.urgency?.toLowerCase()] - urgencyOrder[b.urgency?.toLowerCase()];
  });

  return criticalObstacles;
}

/**
 * 🎤 Generate voice-friendly description
 * 
 * Converts the analysis into natural-sounding text that can be
 * spoken to the user via text-to-speech
 * 
 * @param {object} analysis - The full Gemini analysis
 * @param {boolean} isFirstFrame - Whether this is the first frame of the session
 * @returns {string} Natural language description
 */
export function generateVoiceDescription(analysis, isFirstFrame = false) {
  let description = "";

  // FIRST FRAME: Full contextual description
  if (isFirstFrame) {
    // Scene description with context
    if (analysis.sceneDescription) {
      description += analysis.sceneDescription + ". ";
    }
    
    // User context (what they're carrying/doing)
    if (analysis.userContext) {
      description += analysis.userContext + ". ";
    }
    
    // Path status
    if (analysis.pathStatus === 'clear') {
      description += "The path ahead is clear. ";
    } else if (analysis.obstacles && analysis.obstacles.length > 0) {
      description += "I notice some obstacles: ";
      analysis.obstacles.forEach((obstacle, index) => {
        description += `${obstacle.name} at ${obstacle.distance} to your ${obstacle.position}`;
        if (index < analysis.obstacles.length - 1) {
          description += ", ";
        }
      });
      description += ". ";
    }
    
    // Conversational question
    if (analysis.conversationalQuestion) {
      description += analysis.conversationalQuestion + " ";
    }
    
    // Navigation guidance
    if (analysis.navigationGuidance) {
      description += analysis.navigationGuidance;
    }
    
    return description.trim();
  }

  // SUBSEQUENT FRAMES: Only changes and obstacles
  
  // Critical safety warnings first
  if (analysis.safetyLevel === 'critical' || analysis.safetyLevel === 'danger') {
    description += "⚠️ DANGER ALERT! ";
    if (analysis.warnings && analysis.warnings.length > 0) {
      description += analysis.warnings.join('. ') + '. ';
    }
  }

  // Critical obstacles
  const criticalObstacles = detectCriticalObstacles(analysis);
  if (criticalObstacles.length > 0) {
    description += "Obstacle alert: ";
    criticalObstacles.forEach((obstacle, index) => {
      description += `${obstacle.name} ${obstacle.distance} ${obstacle.position}`;
      if (index < criticalObstacles.length - 1) {
        description += ", ";
      }
    });
    description += ". ";
  }

  // Changes in environment
  if (analysis.changes && analysis.changes !== 'No significant changes') {
    description += analysis.changes + ". ";
  }

  // Simple path status
  if (analysis.pathStatus === 'clear' && criticalObstacles.length === 0) {
    description += "Clear path ahead, keep walking. ";
  }

  // Navigation guidance
  if (analysis.navigationGuidance) {
    description += analysis.navigationGuidance;
  }

  // If nothing to say, provide simple confirmation
  if (description.trim() === "") {
    description = "No changes, path is clear.";
  }

  return description.trim();
}

/**
 * 🧪 Test Gemini API Connection
 * 
 * Simple test function to verify API key is working
 */
export async function testGeminiConnection() {
  try {
    console.log('🧪 Testing Gemini API connection...');
    
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not found in environment variables');
    }

    // Try a simple text generation
    const result = await model.generateContent('Say "Hello from Gemini!"');
    const response = await result.response;
    const text = response.text();

    console.log('✅ Gemini API connected successfully!');
    console.log(`📝 Response: ${text}`);
    
    return { success: true, message: text };
  } catch (error) {
    console.error('❌ Gemini API connection failed:', error.message);
    return { success: false, error: error.message };
  }
}

export default {
  analyzeFrame,
  detectCriticalObstacles,
  generateVoiceDescription,
  testGeminiConnection
};

