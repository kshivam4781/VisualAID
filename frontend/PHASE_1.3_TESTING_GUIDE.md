# Phase 1.3 Testing Guide - Basic Menu System

## How to Test

### 1. Start the Application
```bash
cd frontend
npm run dev
```
Open `http://localhost:5173` in Chrome or Edge

### 2. Test Initial Flow
1. **Click the "🎤 Start" button**
2. **Allow microphone access** when prompted
3. **Listen for greeting:**
   - Should hear: "Good [morning/afternoon/evening]! Hello, how can I help?"
   - Should hear: "How can I help you today? You can say 'be my eye'..."

### 3. Test Main Menu Commands

#### Test "Be My Eye" Command
1. Say: **"be my eye"**
2. ✅ Should hear: "Vision mode activated"
3. ✅ Status should show: "Be My Eye Mode Active"
4. ✅ Menu options should update to show vision mode commands
5. ✅ Footer should show: "Menu: 👁️ Vision"

#### Test "Stop Be My Eye" Command
1. While in vision mode, say: **"stop be my eye"**
2. ✅ Should hear: "Vision mode deactivated"
3. ✅ Should hear: "How can I help you today?..." (returns to main menu)
4. ✅ Status should show: "Main Menu"
5. ✅ Footer should show: "Menu: 🏠 Main"

#### Test Help Command
1. From main menu, say: **"help"**
2. ✅ Should hear: "Here's what I can do. Say 'be my eye' to activate..."
3. ✅ Status should show: "Help & Instructions"
4. ✅ Menu options should show help-specific commands
5. ✅ Footer should show: "Menu: ❓ Help"

#### Test Return to Menu
1. From help menu, say: **"menu"** or **"go back"**
2. ✅ Should hear: "Returning to main menu"
3. ✅ Should hear: "How can I help you today?..."
4. ✅ Status should show: "Main Menu"

### 4. Visual Elements to Verify

#### Status Indicators
- 🎤 Microphone icon when idle
- 🔊 Speaker icon when speaking
- 👁️ Eye icon in vision mode
- ❓ Question mark in help mode

#### Menu Options Section
- Should appear below status when in any menu state
- Should show context-specific commands
- Blue highlight on menu options
- Hover effects on command items

#### Footer Information
- Shows listening status (🟢/🔴)
- Shows mode (Vision Active/Standby)
- Shows current menu (Main/Help/Vision/Greeting/Idle)
- Shows speech status (Speaking/Silent)

### 5. Edge Cases to Test

#### Rapid Command Testing
1. Say "be my eye" immediately followed by "stop be my eye"
   - ✅ Should handle gracefully without conflicts

#### Alternative Phrasings
1. Try: "help me", "what can you do", "how do I use this"
   - ✅ Should trigger help menu

2. Try: "stop", "go back", "main menu"
   - ✅ Should return to main menu

### 6. Expected Behaviors

#### Command Confirmation
- Every command should have audio feedback
- Visual state should update immediately
- Menu options should match current state

#### State Transitions
- Greeting → Main Menu (automatic after 2 seconds)
- Main Menu → Vision Mode (on "be my eye")
- Vision Mode → Main Menu (on "stop be my eye")
- Main Menu → Help (on "help")
- Help → Main Menu (on "menu"/"go back")

#### Audio Flow
- Greetings use interrupt (stop previous speech)
- Menu prompts don't interrupt
- State changes have immediate audio feedback

## Common Issues & Solutions

### Issue: No greeting heard
**Solution:** Click the microphone button to initiate interaction

### Issue: Commands not recognized
**Solution:** 
- Check microphone permissions
- Speak clearly and at normal volume
- Wait for green "Listening" indicator

### Issue: Menu options not updating
**Solution:** Check footer to see current menu state

### Issue: Audio conflicts/overlapping
**Solution:** This has been handled - newer important messages interrupt

## Success Criteria

✅ All voice commands recognized accurately  
✅ Menu navigation flows smoothly  
✅ Audio feedback is natural and clear  
✅ Visual indicators update in real-time  
✅ No TypeScript or console errors  
✅ Responsive design works on mobile  

## Screenshots Checklist

When testing, verify these UI states:
- [ ] Initial idle state
- [ ] After greeting (main menu)
- [ ] Vision mode active
- [ ] Help menu displayed
- [ ] Transcript showing voice input
- [ ] Command confidence display
- [ ] Error state (deny microphone to test)

---

**Phase 1.3 Complete!** 🎉  
Ready to proceed to Phase 2: Camera & Frame Capture

