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

// Export openai client for direct use
export { openai };

/**
 * 🎯 CORE FUNCTION: Analyze a captured frame using GPT-4 Vision
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
    console.log(`🤖 Starting ChatGPT analysis for frame ${metadata.captureCount || 'unknown'}...`);

    // Validate image data
    if (!base64Image || base64Image.length < 100) {
      console.error('❌ Invalid image data: too short or empty');
      throw new Error('Invalid image data received');
    }
    
    // Log image data info for debugging
    const imageDataPreview = base64Image.substring(0, 100);
    console.log(`📸 Image data length: ${base64Image.length} chars`);
    console.log(`📸 Image data preview: ${imageDataPreview}...`);

    // Ensure proper data URL format
    let imageUrl = base64Image;
    if (!base64Image.startsWith('data:image')) {
      imageUrl = `data:image/jpeg;base64,${base64Image}`;
    }

    // Determine if this is the first frame or a subsequent frame
    const isFirstFrame = !previousAnalysis || metadata.captureCount === 1;
    
    console.log(`🎯 Frame Mode: ${isFirstFrame ? 'FIRST FRAME (Full Context)' : 'SUBSEQUENT FRAME (Changes Only)'}`);
    
    // Prepare the prompt - different for first frame vs subsequent frames
    let systemPrompt, userPrompt;
    
    if (isFirstFrame) {
      // FIRST FRAME: Full contextual description with conversational tone
      systemPrompt = `You are an assistive technology AI for visually impaired users. This is a legitimate accessibility use case for navigation and environment understanding. Analyze the environment and surroundings visible in the image. Any people visible are part of the environment context, not the subject of identification. The user is behind the camera holding it. Provide environmental descriptions in JSON format.`;
      
      userPrompt = `**ASSISTIVE TECHNOLOGY USE CASE:** This image is from a visual assistance app helping a blind/visually impaired person navigate. We are analyzing the ENVIRONMENT and surroundings, NOT identifying individuals.

**IMPORTANT CONTEXT:**
- The user is BEHIND the camera (holding the phone with their hand)
- Any hands/arms visible at the bottom/edges are the USER'S OWN hands holding the device - ignore them
- **PEOPLE ARE OBSTACLES:** Any people directly in the camera's field of view are OBSTACLES that need to be reported! People sitting in front, standing in the path, or blocking the view MUST be listed in the "obstacles" array with high urgency.
- Only people who are clearly far away or not in the direct path (background, sitting at a different table, etc.) are environmental context
- Focus on: environment, obstacles (especially PEOPLE), navigation, safety, and objects

This is the FIRST view of the scene.

Provide a complete, contextual description:

1. CAMERA ORIENTATION (Critical for user guidance):
   - Assess what the camera is primarily pointing at:
     * UPWARD: Mostly ceiling, overhead lights, roof, sky (>60% of frame is ceiling/overhead)
     * DOWNWARD: Mostly floor, ground, feet, shoes (>60% of frame is floor/ground)
     * TILTED: Heavily angled, mostly walls/vertical surfaces at odd angles
     * FORWARD: Normal eye-level view of environment ahead (ideal)
   - This is CRITICAL - if camera orientation is wrong, user needs to be told!

2. LIGHTING & IMAGE QUALITY (CRITICAL - Highest Priority):
   - Assess the lighting: bright/moderate/dim/dark/very dark
   - Is the image clear or blurry?
   - **IF LIGHTING IS TOO DARK (dark/very dark) OR TOO BRIGHT (overexposed):**
     * Set "canSee": false
     * Provide a clear "visibilityMessage" explaining the problem
     * Examples:
       - "I'm having trouble seeing clearly because it's quite dark. Could you move to a brighter area or turn on some lights?"
       - "The lighting is too dark for me to see what's around you. Let me know when you're in a better lit space."
       - "It's very bright and overexposed - I can't make out details. Could you shade the camera or adjust the lighting?"
   - If lighting is poor but usable, still mention it: "The lighting is dim, but I can make out..."

3. MAIN SCENE UNDERSTANDING:
   - What type of environment is this? (library, office, classroom, home, outdoor space, event venue, etc.)
   - What's the overall atmosphere and purpose of this space?
   - What might the user be doing here? (studying, working, attending event, navigating, shopping)
   - Focus on what's RELEVANT to someone navigating this space
   - Be specific and detailed - this is their first view!

2. THE VIEW AHEAD (User's perspective):
   - What is directly in the user's field of view?
   - What environment are they about to enter or navigate?
   - Any visible hands/arms in frame indicate user is holding something
   - Bottom of frame may show user's belongings (bag, cane, etc.)

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

5. MOTION DETECTION (IMPORTANT for safety):
   - Are there any people or vehicles MOVING in the scene?
   - Look for motion blur, different positions of limbs, wheels turning
   - Are people walking, cars driving, doors opening, etc.?
   - Direction of movement (towards user, away, left to right, etc.)
   - Speed: slow/moderate/fast
   - This is CRITICAL for safety - moving objects are potential hazards!

6. CONVERSATIONAL CONTEXT:
   - Ask a friendly question about where they are or what they might be doing
   - "Looks like you're in a library, are you here to study?"
   - "You're in a store, can I help you find something?"
   - "You're outdoors, which way are you headed?"
   - Make it natural and helpful based on the ENVIRONMENT, not the user's appearance

6. FOCUSED OBJECT DETECTION (Important for detailed descriptions):
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

Return ONLY valid JSON with this structure:
{
  "canSee": true/false,
  "visibilityMessage": "If canSee=false, explain why (e.g., 'It's too dark to see clearly' or 'The lighting is too bright and overexposed')",
  "cameraOrientation": {
    "direction": "upward/downward/tilted/forward",
    "confidence": "high/medium/low",
    "percentageOfFrame": "estimated % of frame that's ceiling/floor/etc (e.g., 70%, 80%)",
    "needsAdjustment": true/false,
    "adjustmentMessage": "If needsAdjustment=true, provide a friendly message like: 'I think the camera is pointing upward - I'm mostly seeing the ceiling. Could you hold your phone at chest level, pointing straight ahead? That way I can see what's around you.'"
  },
  "sceneDescription": "Natural, conversational description of the environment from user's perspective (include lighting conditions if relevant)",
  "environmentType": "library/classroom/office/home/outdoor/event/store/etc",
  "lighting": "bright/moderate/dim/dark/very dark",
  "imageQuality": "clear/slightly blurry/blurry/very blurry",
  "viewAhead": "Brief description of what's directly in front of the user",
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
  "movingObjects": [
    {
      "name": "what is moving (person, car, bicycle, etc.)",
      "direction": "towards user/away from user/left to right/right to left/approaching/moving away",
      "speed": "slow/moderate/fast",
      "distance": "estimated distance in feet",
      "isApproaching": true/false,
      "safetyLevel": "safe/caution/danger - how urgent is this movement?"
    }
  ],
  "pathStatus": "clear/caution/blocked (if someone is sitting/standing in front, status must be 'blocked')",
  "conversationalQuestion": "Friendly question about their context",
  "navigationGuidance": "Simple, friendly instruction"
}

BE CONVERSATIONAL. Focus on CONTEXT and RELEVANCE, not exhaustive lists.`;
    } else {
      // SUBSEQUENT FRAMES: Only describe CHANGES and obstacles
      systemPrompt = `You are an assistive technology AI for visually impaired users. This is a legitimate accessibility use case. Analyze environmental changes between frames. Any people visible are environmental context (not for identification). The user is behind the camera. Provide concise updates in JSON format.`;
      
      userPrompt = `**ASSISTIVE TECHNOLOGY USE CASE:** Analyzing environmental changes for a blind/visually impaired person's navigation.

**CONTEXT:**
- User is behind the camera (any visible hands/arms are user's own - ignore them)
- **PEOPLE ARE OBSTACLES:** People directly in the camera's field of view are obstacles to navigation
- Only people who are clearly far away in the background are environmental context
- Focus on: changes, movement, obstacles (especially PEOPLE), safety

This is frame #${metadata.captureCount} of an ongoing session.

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

Return ONLY valid JSON with this structure:
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
    
    // Send to ChatGPT for analysis
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Using GPT-4 with vision capabilities
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: userPrompt 
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high" // Use high detail for better analysis
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    });

    const text = response.choices[0].message.content;

    console.log(`✅ ChatGPT analysis complete`);
    console.log(`📝 Raw ChatGPT response (first 500 chars):`, text.substring(0, 500));

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
        model: "gpt-4o",
        confidence: confidence,
        processingTime: metadata.processingTime || null
      }
    };

    // Log summary
    console.log(`📊 Analysis Summary:`);
    console.log(`   - Scene: ${analysis.sceneDescription?.substring(0, 50)}...`);
    console.log(`   - Objects detected: ${analysis.objects?.length || 0}`);
    console.log(`   - Obstacles: ${analysis.obstacles?.length || 0}`);
    console.log(`   - Confidence: ${confidence.toFixed(2)}`);

    return enrichedAnalysis;

  } catch (error) {
    console.error('❌ OpenAI API Error:', error.message);
    
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
 * @param {object} analysis - The full ChatGPT analysis
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
 * @param {object} analysis - The full ChatGPT analysis
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
    
    // 📖 FOCUSED OBJECT: If user is looking at something specific
    if (analysis.focusedObject && analysis.focusedObject.detected) {
      const focused = analysis.focusedObject;
      
      if (focused.text && focused.text.trim() !== '') {
        // Read the text if available
        description += `I can see ${focused.name || 'text'} taking up most of the view. `;
        if (focused.context) {
          description += `${focused.context}. `;
        }
        description += `It says: "${focused.text}". `;
      } else if (focused.description) {
        // Describe the object
        description += `The main thing in view is ${focused.name || 'an object'}. `;
        description += `${focused.description}. `;
      }
    } else {
      // View ahead (what's in front of user) - only if not focused on specific object
      if (analysis.viewAhead) {
        description += analysis.viewAhead + ". ";
      }
    }
    
    // MOTION DETECTION (Priority alert for first frame)
    if (analysis.movingObjects && analysis.movingObjects.length > 0) {
      // Check for approaching objects
      const approachingObjects = analysis.movingObjects.filter(obj => 
        obj.isApproaching === true || obj.direction?.includes('towards') || obj.direction?.includes('approaching')
      );
      
      if (approachingObjects.length > 0) {
        description += "⚠️ ALERT! ";
        approachingObjects.forEach((obj, index) => {
          description += `${obj.name} is coming closer to you`;
          if (obj.distance) {
            description += ` at ${obj.distance}`;
          }
          if (index < approachingObjects.length - 1) {
            description += ", ";
          }
        });
        description += ". ";
      }
      
      const dangerousMovement = analysis.movingObjects.filter(obj => obj.safetyLevel === 'danger' && !obj.isApproaching);
      if (dangerousMovement.length > 0) {
        description += "⚠️ MOVEMENT ALERT! ";
        dangerousMovement.forEach((obj, index) => {
          description += `${obj.name} ${obj.direction} at ${obj.distance}`;
          if (obj.alert) {
            description += ` - ${obj.alert}`;
          }
          if (index < dangerousMovement.length - 1) {
            description += ", ";
          }
        });
        description += ". ";
      } else if (approachingObjects.length === 0) {
        // Non-dangerous movement
        const otherMovement = analysis.movingObjects.filter(obj => obj.safetyLevel !== 'danger');
        if (otherMovement.length > 0) {
          description += "I see movement: ";
          otherMovement.forEach((obj, index) => {
            description += `${obj.name} ${obj.direction}`;
            if (index < otherMovement.length - 1) {
              description += ", ";
            }
          });
          description += ". ";
        }
      }
    }
    
    // Path status (only if not focused on a specific object)
    if (!analysis.focusedObject?.detected) {
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
    }
    
    // Conversational question
    if (analysis.conversationalQuestion) {
      description += analysis.conversationalQuestion + " ";
    }
    
    // Navigation guidance (only if not focused on object)
    if (analysis.navigationGuidance && !analysis.focusedObject?.detected) {
      description += analysis.navigationGuidance;
    }
    
    return description.trim();
  }

  // SUBSEQUENT FRAMES: Only changes and obstacles
  
  // Determine if user is moving
  const userIsMoving = analysis.userMoving && analysis.userMoving.isMoving;
  
  // 🚨 PRIORITY 1: APPROACHING OBJECTS/PEOPLE (ALWAYS ALERT - even if user is stationary!)
  if (analysis.movingObjects && analysis.movingObjects.length > 0) {
    // Check for approaching objects first
    const approachingObjects = analysis.movingObjects.filter(obj => 
      obj.isApproaching === true || 
      obj.direction?.includes('towards') || 
      obj.direction?.includes('approaching')
    );
    
    if (approachingObjects.length > 0) {
      // CRITICAL: Always alert about approaching objects, regardless of user movement
      approachingObjects.forEach((obj, index) => {
        const isDangerous = obj.safetyLevel === 'danger';
        if (isDangerous) {
          description += "⚠️ ALERT! ";
        }
        
        if (obj.alert) {
          description += obj.alert + " ";
        } else {
          description += `${obj.name} is coming closer to you`;
          if (obj.direction) {
            description += ` from the ${obj.direction.replace('towards user', '').replace('approaching', '').trim()}`;
          }
          if (obj.distance) {
            description += `, currently at ${obj.distance}`;
          }
          description += ". ";
        }
      });
    }
    
    // Other dangerous movement
    const dangerousMovement = analysis.movingObjects.filter(obj => 
      obj.safetyLevel === 'danger' && !obj.isApproaching
    );
    if (dangerousMovement.length > 0) {
      description += "⚠️ MOVEMENT ALERT! ";
      dangerousMovement.forEach((obj, index) => {
        if (obj.alert) {
          description += obj.alert + " ";
        } else {
          description += `${obj.name} ${obj.direction} at ${obj.distance}, moving ${obj.speed}`;
        }
        if (index < dangerousMovement.length - 1) {
          description += ", ";
        }
      });
      description += ". ";
    }
  }
  
  // Critical safety warnings
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
  
  // 🎯 BRANCH: Different behavior based on user movement
  if (!userIsMoving) {
    // ===== USER IS STATIONARY =====
    
    // 📖 FOCUSED OBJECT: Describe what they're looking at
    if (analysis.focusedObject && analysis.focusedObject.detected) {
      const focused = analysis.focusedObject;
      
      if (focused.text && focused.text.trim() !== '') {
        // Read the text if available
        description += `I can see ${focused.name || 'text'}. `;
        if (focused.context) {
          description += `${focused.context}. `;
        }
        description += `It says: "${focused.text}". `;
      } else if (focused.description) {
        // Describe the object
        description += `You're looking at ${focused.name || 'something'}. `;
        description += `${focused.description}. `;
      } else {
        description += `The main thing in view is ${focused.name}. `;
      }
    }
    
    // Non-critical movement info (for stationary user awareness)
    if (analysis.movingObjects && analysis.movingObjects.length > 0) {
      const nonApproachingMovement = analysis.movingObjects.filter(obj => 
        obj.safetyLevel === 'safe' || obj.safetyLevel === 'caution'
      );
      if (nonApproachingMovement.length > 0 && !analysis.focusedObject?.detected) {
        description += "I notice: ";
        nonApproachingMovement.forEach((obj, index) => {
          description += `${obj.name} ${obj.direction}`;
          if (index < nonApproachingMovement.length - 1) {
            description += ", ";
          }
        });
        description += ". ";
      }
    }
    
    // Changes in environment (only if not focused on main object)
    if (!analysis.focusedObject?.detected && analysis.changes && analysis.changes !== 'No significant changes') {
      description += analysis.changes + ". ";
    }
    
    // DON'T provide navigation guidance when stationary (unless there's a focused object description)
    
  } else {
    // ===== USER IS MOVING =====
    
    // 🚶 Tell them they're moving
    const userDir = analysis.userMoving.direction;
    const userSpeed = analysis.userMoving.speed;
    
    if (userSpeed === 'fast') {
      description += `You're moving ${userDir} quickly. `;
    } else if (userDir === 'turning left' || userDir === 'turning right') {
      description += `You're ${userDir}. `;
    } else if (userDir !== 'stationary') {
      description += `You're walking ${userDir}. `;
    }
    
    // Changes in environment
    if (analysis.changes && analysis.changes !== 'No significant changes') {
      description += analysis.changes + ". ";
    }
    
    // Path status and navigation
    if (analysis.pathStatus === 'clear' && criticalObstacles.length === 0 && (!analysis.movingObjects || analysis.movingObjects.length === 0)) {
      description += "Clear path ahead, keep walking. ";
    }
    
    // Navigation guidance (only when moving)
    if (analysis.navigationGuidance && analysis.navigationGuidance.trim() !== '') {
      description += analysis.navigationGuidance;
    }
  }

  // If nothing to say, provide simple confirmation based on movement
  if (description.trim() === "") {
    if (!userIsMoving) {
      description = "No changes detected.";
    } else {
      description = "No changes, path is clear.";
    }
  }

  return description.trim();
}

/**
 * 🧪 Test OpenAI API Connection
 * 
 * Simple test function to verify API key is working
 */
export async function testOpenAIConnection() {
  try {
    console.log('🧪 Testing OpenAI API connection...');
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not found in environment variables');
    }

    // Try a simple text generation
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: "Say 'Hello from ChatGPT!'"
        }
      ],
      max_tokens: 20
    });

    const text = response.choices[0].message.content;

    console.log('✅ OpenAI API connected successfully!');
    console.log(`📝 Response: ${text}`);
    
    return { success: true, message: text };
  } catch (error) {
    console.error('❌ OpenAI API connection failed:', error.message);
    return { success: false, error: error.message };
  }
}

export default {
  analyzeFrame,
  detectCriticalObstacles,
  generateVoiceDescription,
  testOpenAIConnection
};

