# 🚨 Motion Detection Feature

Your VisualAID app now detects and tracks moving objects for enhanced safety!

## 🎯 What It Does

### Frame-by-Frame Analysis
ChatGPT now analyzes:
1. **First Frame**: Detects any visible motion (people walking, cars moving, etc.)
2. **Subsequent Frames**: Compares with previous frame to detect position changes
3. **User Movement**: Detects if YOU (the camera holder) are moving!

### What Gets Detected

#### 🚶 User Movement (YOU holding the phone)
- **Walking**: Forward, backward, sideways
- **Turning**: Left, right, looking around
- **Speed**: Slow, moderate, fast
- **Visual Cues**: Background shifting, parallax effect, camera shake
- **Voice Alert**: "You're walking forward" or "You're turning right"

#### 🚗 Object Movement (Things in the scene)
- **People**: Walking, running, approaching, moving away
- **Vehicles**: Cars, bikes, scooters - driving, parking, approaching
- **Objects**: Doors opening, items falling, animals moving
- **Direction**: Towards user, away, left-to-right, approaching, receding
- **Speed**: Slow, moderate, fast
- **Safety Level**: Safe, caution, danger

### How We Distinguish

**User Moving:**
- ALL objects shift together in same direction
- Background walls/floor moving
- Parallax effect (closer objects move faster)
- Entire scene shifting

**Objects Moving:**
- ONLY specific objects change position
- Background stays stable
- Motion blur only on moving object

**Both Moving:**
- Background shifts + object moves differently
- E.g., You're walking AND a car is approaching

## 🚨 Safety Prioritization

### Alert Levels
1. **🚨 DANGER** - Immediate threat
   - Car approaching quickly
   - Person running towards user
   - Object falling
   - Voice alert: "⚠️ MOVEMENT ALERT! Car approaching from left!"

2. **⚠️ CAUTION** - Potential concern
   - Person walking nearby
   - Bicycle passing
   - Door opening
   - Voice alert: "Movement detected: person walking left to right"

3. **✅ SAFE** - Informational only
   - Person walking far away
   - Car in parking lot
   - Background movement

## 📊 Data Structure

### Moving Object Format
```json
{
  "name": "person",
  "direction": "towards user",
  "speed": "fast",
  "distance": "10 feet",
  "previousDistance": "20 feet",
  "safetyLevel": "danger",
  "alert": "Person running towards you from ahead!"
}
```

## 🎤 Voice Alerts

### Priority Order (What You'll Hear)
1. **Dangerous movement** (FIRST & URGENT)
   - "⚠️ MOVEMENT ALERT! Car approaching from left!"
   - Interrupts current speech if critical

2. **Caution movement**
   - "Movement detected: person walking left to right"

3. **Static obstacles**
   - "Obstacle alert: chair 5 feet center"

4. **Environment changes**
   - "Door opened on your right"

5. **Path status**
   - "Clear path ahead, keep walking"

## 💡 How It Works

### First Frame Analysis
```
User starts vision mode
↓
Camera captures frame 1
↓
ChatGPT analyzes: "Is anything moving?"
↓
Detects: Person with motion blur, walking posture
↓
Reports: "I see movement: person walking right to left"
```

### Subsequent Frame Analysis
```
Camera captures frame 2 (15 seconds later)
↓
ChatGPT compares with frame 1:
  - Person was at 20 feet → now at 10 feet
  - Person was on left → now more centered
↓
Calculates: Getting closer, moving towards user
↓
Reports: "⚠️ MOVEMENT ALERT! Person approaching from left at 10 feet"
```

## 🧪 Testing Motion Detection

### Indoor Testing
1. **Say "be my eye"**
2. Have someone walk across the frame
3. Listen for: "Movement detected: person walking left to right"
4. Have them approach camera
5. Listen for: "Person approaching" or higher urgency alert

### Outdoor Testing (BE CAREFUL!)
1. Start vision mode in safe location
2. Point camera at street (from sidewalk)
3. Listen for vehicle detection
4. Note: Distance and speed estimates

### Best Test Scenarios
- ✅ Someone walking towards you
- ✅ Someone walking past you
- ✅ Car driving by
- ✅ Person on bicycle
- ✅ Door opening/closing
- ✅ Pet moving around

## 📝 Console Logs

### What You'll See
```javascript
// User movement detected
🚶 USER MOVEMENT DETECTED: {
  isMoving: true,
  direction: "forward",
  speed: "moderate",
  indication: "background shifting, parallax effect visible"
}
   Direction: forward
   Speed: moderate
   Indication: background shifting, parallax effect visible

// Object motion detected
🚨 MOTION DETECTED: [
  {
    name: "person",
    direction: "towards user",
    speed: "moderate",
    distance: "15 feet",
    safetyLevel: "caution"
  }
]

// Dangerous movement
⚠️⚠️⚠️ DANGEROUS MOVEMENT: [
  {
    name: "car",
    direction: "approaching from left",
    speed: "fast",
    distance: "30 feet",
    safetyLevel: "danger",
    alert: "Car approaching from left!"
  }
]

// Critical alert
🚨 ALERT: Car approaching from left!

// Both user and object moving
🚶 USER MOVEMENT DETECTED: { isMoving: true, direction: "forward" }
🚨 MOTION DETECTED: [{ name: "person", direction: "towards user" }]
```

## 🔧 Customization

### Adjust Sensitivity
Edit `backend/src/services/openaiService.js`:

**Line 75-81**: Motion detection criteria
```javascript
// Make it more sensitive
"Look for ANY subtle movement, even slight position changes"

// Make it less sensitive  
"Only report significant movement, ignore background activity"
```

### Adjust Safety Thresholds
Edit voice generation (line 445-473):
```javascript
// More cautious
const dangerousMovement = analysis.movingObjects.filter(
  obj => obj.safetyLevel === 'danger' || obj.safetyLevel === 'caution'
);

// Less cautious (only report danger)
const dangerousMovement = analysis.movingObjects.filter(
  obj => obj.safetyLevel === 'danger'
);
```

### Adjust Frame Capture Rate
Faster = Better motion detection, Higher cost

**Frontend** `useFrameCapture.ts`:
```typescript
// Current: 15 seconds
const CAPTURE_INTERVAL = 15000;

// Faster motion detection: 10 seconds
const CAPTURE_INTERVAL = 10000;

// Balance: 20 seconds
const CAPTURE_INTERVAL = 20000;
```

## 💰 Cost Impact

**No additional cost!** Motion detection uses the same API call.

- Same cost per frame: ~$0.01
- Just enhanced prompts (no extra API calls)
- More valuable data from each frame

## ⚡ Performance

### Response Time
- Same as before: ~2-3 seconds per frame
- Motion detection is part of single analysis
- No performance overhead

### Accuracy
- **Best for**: Large movements, people, vehicles
- **Good for**: Direction, relative speed
- **Limited**: Exact distances, very subtle motion
- **Improves**: With closer frames (shorter intervals)

## 🎯 Real-World Examples

### Scenario 1: Walking on Sidewalk
```
Frame 1: "You're on a sidewalk, path is clear"
Frame 2: "You're walking forward. Movement detected: person walking towards you from ahead, 20 feet"
Frame 3: "You're still walking. Person approaching, now 10 feet, moving to your right"
Frame 4: "You're walking forward. Person passed you, path clear ahead"
```

### Scenario 2: Crossing Street (Stationary)
```
Frame 1: "You're at a crosswalk"
Frame 2: "⚠️ MOVEMENT ALERT! Car approaching from right, 40 feet, moving fast"
Frame 3: "Car is closer, 20 feet - wait before crossing"
Frame 4: "Car has passed, path is clear to cross"
```

### Scenario 3: User Walking Toward Wall
```
Frame 1: "You're in a hallway"
Frame 2: "You're walking forward. Wall ahead at 15 feet"
Frame 3: "You're walking forward quickly. Wall ahead at 8 feet"
Frame 4: "⚠️ You're walking towards a wall - STOP! Wall 3 feet ahead"
```

### Scenario 4: Turning Corner
```
Frame 1: "You're in a hallway"
Frame 2: "You're turning right. Doorway on your new left"
Frame 3: "You stopped turning. Path ahead is clear"
Frame 4: "You're walking forward in new direction"
```

### Scenario 5: Both User and Object Moving
```
Frame 1: "You're on a sidewalk"
Frame 2: "You're walking forward. Person also walking towards you, 30 feet ahead"
Frame 3: "You're still walking. Person getting closer, 15 feet"
Frame 4: "You're walking. Person approaching, 8 feet - moving to pass on your right"
```

## 🚀 Future Enhancements

### Possible Improvements
- **Visual indicators**: Show movement on screen
- **Sound alerts**: Beep for dangerous movement
- **Vibration alerts**: Phone vibrates for critical movement
- **Movement history**: Track objects across multiple frames
- **Predictive alerts**: "Car will reach you in 5 seconds"
- **Speed calculations**: Actual mph/kph estimates

## 🔍 Debugging

### Motion Not Detected?
1. **Check frame interval**: Too slow? (>30s)
2. **Check movement speed**: Too slow between frames?
3. **Check console logs**: Is AI analyzing properly?
4. **Try obvious motion**: Walk directly at camera

### False Positives?
1. **Camera movement**: Hold phone steady
2. **Lighting changes**: Can trigger false detection
3. **Background activity**: Adjust sensitivity

### Console Checks
```javascript
// Should see motion in analysis
🎯 Received ChatGPT analysis for frame 2: {
  movingObjects: [...],  // Should have data
  ...
}

// If empty when motion present
movingObjects: []  // AI didn't detect it
```

## 📖 Key Files Modified

1. **`backend/src/services/openaiService.js`**
   - Line 75-81: First frame motion prompt
   - Line 143-149: Subsequent frame motion prompt
   - Line 111-119: Motion object JSON structure
   - Line 170-180: Subsequent frame motion structure
   - Line 386-412: First frame voice alerts
   - Line 443-473: Subsequent frame voice alerts

2. **`frontend/src/components/VoiceInterface.tsx`**
   - Line 168-186: Motion detection logging
   - Dangerous movement highlighting
   - Console warnings for critical movement

## ✅ Testing Checklist

- [ ] Start vision session
- [ ] Capture first frame - check for motion
- [ ] Move object in frame
- [ ] Wait for next capture
- [ ] Check console for motion detection
- [ ] Listen for voice alert
- [ ] Test dangerous scenario (have someone walk towards camera)
- [ ] Verify urgent alert triggers

---

**Motion detection is now active! 🎉**

Your app will alert users to moving objects, significantly improving safety for visually impaired navigation.

