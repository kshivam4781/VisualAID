# VisualAID Development Roadmap

## MVP Development Strategy

This roadmap outlines a step-by-step approach to building VisualAID, starting with core MVP features and progressively adding functionality.

**Note:** As you complete each task, mark it as completed by changing `- [ ]` to `- [x]` to track your progress.

---

## Phase 0: Project Setup & Infrastructure

### Step 0.1: Initialize Project Structure
- [x] Create React + TypeScript frontend
- [x] Create Node.js + Express backend
- [x] Set up Supabase PostgreSQL database
- [x] Configure environment variables (.env files)
- [x] Set up basic routing and project structure

### Step 0.2: Database Setup
- [x] Create Supabase account and project
- [x] Initialize database schema (run schema.sql in Supabase SQL Editor)
- [x] Create all tables (users, emergency_contacts, session_frames, danger_alerts, user_notes)
- [x] Test database connections
- [x] Database connection verified and working
- [x] Create basic CRUD operations for each table
 - [x] Backend REST endpoints tested locally (health, DB connection, users CRUD)

### Step 0.3: Development Environment
- [x] Set up WebSocket (Socket.io)
- [x] Configure CORS for frontend-backend communication
- [x] Set up basic error handling and logging

**Estimated Time:** 2-3 days  
**Dependencies:** None  
**Status:** ✅ COMPLETE

---

## Phase 1: Basic Voice Interface (MVP Core)

### Step 1.1: Voice Input Setup
- [x] Implement Web Speech API for voice recognition
- [x] Add wake word detection ("be my eye", "stop be my eye")
- [x] Handle voice commands and convert to text
- [x] Test voice recognition accuracy

### Step 1.2: Voice Output Setup
- [x] Implement text-to-speech (Web Speech API)
- [x] Create greeting system ("Hello, how can I help?")
- [x] Set up conversational tone
- [x] Test voice output quality

### Step 1.3: Basic Menu System
- [x] Create main menu state management
- [x] Add "How can I help?" prompt
- [x] Handle menu navigation via voice
- [x] Implement basic commands (start, stop, help)

**Estimated Time:** 3-4 days  
**Dependencies:** Phase 0 complete  
**Status:** ✅ COMPLETE

---

## Phase 2: Camera & Frame Capture (MVP Core)

### Step 2.1: Camera Access
- [x] Request camera permissions via getUserMedia()
- [x] Display camera feed (optional for testing)
- [x] Handle camera access errors gracefully
- [x] Test on different devices/browsers

### Step 2.2: Frame Capture Logic
- [x] Implement 5-second interval capture
- [x] Convert video frames to base64 images
- [x] Send frames to backend via WebSocket
- [x] Optimize image size for API calls

### Step 2.3: Session Management
- [x] Create session on "be my eye" command
- [x] Track active camera sessions
- [x] Handle session cleanup on "stop be my eye"
- [x] Store session data in PostgreSQL

**Estimated Time:** 3-4 days  
**Dependencies:** Phase 1 complete  
**Status:** ✅ COMPLETE

---

## Phase 3: AI Integration - Gemini (MVP Core)

### Step 3.1: Gemini API Setup
- [x] Set up Gemini API credentials
- [x] Create Gemini service module
- [x] Test API connection
- [x] Handle API errors and rate limits

### Step 3.2: Frame Analysis
- [x] Send frames to Gemini for analysis
- [x] Receive and parse responses
- [x] Extract key objects, obstacles, and descriptions
- [x] Store analysis in session_frames table

### Step 3.3: Obstacle Detection
- [x] Identify obstacles in Gemini responses
- [x] Prioritize obstacles by urgency
- [x] Alert user about detected obstacles
- [x] Log obstacles for tracking

**Estimated Time:** 4-5 days  
**Dependencies:** Phase 2 complete  
**Status:** ✅ COMPLETE

---

## Phase 4: AI Integration - ChatGPT (MVP Core)

### Step 4.1: ChatGPT API Setup
- [x] Set up OpenAI API credentials
- [x] Create ChatGPT service module
- [x] Configure conversational flow
- [x] Test API connection
- [x] **BONUS:** Implement OpenAI Realtime API for voice-to-voice communication

### Step 4.2: Conversational Logic
- [ ] Implement "How can I help?" responses
- [ ] Handle user questions and commands
- [ ] Maintain conversation context
- [ ] Create natural, encouraging responses 

### Step 4.3: Smart Frame Descriptions
- [ ] Use ChatGPT to enhance Gemini descriptions
- [ ] Add conversational context to frames
- [ ] Ignore previously described objects
- [ ] Create natural-sounding descriptions

**Estimated Time:** 4-5 days  
**Dependencies:** Phase 3 complete

---

## Phase 5: User Registration (MVP Core)

### Step 5.1: Registration Detection
- [ ] Check for user session/cookies on app load
- [ ] Detect if user wants to register
- [ ] Trigger conversational registration flow
- [ ] Handle both express and casual registration

### Step 5.2: Conversational Registration Flow
- [ ] Ask for name → Validate and encourage
- [ ] Ask for email → Validate format
- [ ] Ask for password phrase → Validate length (5+ words)
- [ ] Hash password phrase securely
- [ ] Save user to database

### Step 5.3: Emergency Contact Setup
- [ ] Prompt for emergency contact
- [ ] Explain mandatory requirement
- [ ] Offer default option (Sky Transport Solutions)
- [ ] Validate and save emergency contact
- [ ] Set default contact: Name="Sky Transport Solutions", Phone="3502178666", Email="@skytransportsolutions.com"

**Estimated Time:** 4-5 days  
**Dependencies:** Phase 4 complete

---

## Phase 6: Context Tracking & Smart Descriptions (MVP Enhancement)

### Step 6.1: Frame Comparison Logic
- [ ] Store last 3-5 frame analyses in memory
- [ ] Compare current frame with previous frames
- [ ] Identify new objects vs. previously seen
- [ ] Track user movement and speed (rough estimate)

### Step 6.2: Intelligent Descriptions
- [ ] Describe only new/different objects
- [ ] Prioritize important and changing elements
- [ ] Skip repetitive descriptions
- [ ] Highlight obstacles and dynamic objects

### Step 6.3: Continuous Conversation
- [ ] Maintain conversation flow between frames
- [ ] Answer user questions even during active vision
- [ ] Balance frame descriptions with user interaction
- [ ] Handle interrupts gracefully

**Estimated Time:** 5-6 days  
**Dependencies:** Phase 5 complete

---

## Phase 7: Safety Features - Danger Detection (MVP Enhancement)

### Step 7.1: Danger Detection Logic
- [ ] Train Gemini to identify dangerous situations
- [ ] Detect obstacles, hazards, unsafe conditions
- [ ] Prioritize danger alerts over regular descriptions
- [ ] Trigger immediate alerts to user

### Step 7.2: Emergency Alert System
- [ ] Save dangerous frame images locally
- [ ] Store danger alerts in database
- [ ] Log timestamp and context
- [ ] Prepare email notification system (for future)

### Step 7.3: Safety Protocol
- [ ] Clear, urgent voice alerts for dangers
- [ ] Repeat critical information
- [ ] Offer to stop and reassess
- [ ] Track safety incidents

**Estimated Time:** 4-5 days  
**Dependencies:** Phase 6 complete

---

## Phase 8: Testing & Refinement (MVP Complete)

### Step 8.1: End-to-End Testing
- [ ] Test complete user registration flow
- [ ] Test "be my eye" activation and deactivation
- [ ] Test frame capture and analysis pipeline
- [ ] Test voice commands and responses
- [ ] Test obstacle detection and alerts

### Step 8.2: Performance Optimization
- [ ] Optimize API calls (reduce unnecessary requests)
- [ ] Optimize frame processing speed
- [ ] Reduce latency in voice responses
- [ ] Optimize WebSocket communication

### Step 8.3: Error Handling & Edge Cases
- [ ] Handle camera access denied
- [ ] Handle API failures gracefully
- [ ] Handle network disconnections
- [ ] Handle invalid voice commands
- [ ] Handle emergency situations

### Step 8.4: User Testing
- [ ] Test with visually impaired users (if possible)
- [ ] Gather feedback on voice interface
- [ ] Refine conversational tone
- [ ] Improve accuracy of descriptions

**Estimated Time:** 5-7 days  
**Dependencies:** Phase 7 complete

---

## Post-MVP Features (Future Enhancements)

### Feature 9: Notes OCR & Memory
- [ ] Detect notes in camera frames
- [ ] Extract text using OCR
- [ ] Store location and content
- [ ] Help user find notes later

### Feature 10: Google Maps Navigation
- [ ] Integrate Google Maps API
- [ ] Get navigation directions
- [ ] Convert directions to conversational format via ChatGPT
- [ ] Provide real-time navigation assistance

### Feature 11: Speed & Movement Tracking
- [ ] Analyze frame-to-frame movement
- [ ] Estimate walking speed
- [ ] Adjust alert timing based on speed
- [ ] Improve obstacle prediction

### Feature 12: Latest News & Information
- [ ] Integrate news API
- [ ] Read out latest news on request
- [ ] Personalized news based on interests
- [ ] Conversational news presentation

### Feature 13: Advanced Emergency Features
- [ ] Automatic email alerts for danger
- [ ] Call emergency contacts
- [ ] Integrate with emergency services
- [ ] Share location in emergencies

---

## MVP Completion Criteria

The MVP is considered complete when:

✅ User can register via conversational voice flow  
✅ User can activate "be my eye" mode with voice command  
✅ Camera captures frames every 5 seconds  
✅ Gemini analyzes frames and identifies objects/obstacles  
✅ ChatGPT provides natural, conversational descriptions  
✅ System detects and alerts about obstacles  
✅ Context tracking ignores already-described objects  
✅ User can stop with "stop be my eye" command  
✅ Emergency contacts are stored (with default option)  
✅ System maintains conversation throughout session  
✅ Basic danger detection works  

---

## Timeline Estimate

**Total MVP Development:** 6-8 weeks

- Phase 0: 2-3 days
- Phase 1: 3-4 days
- Phase 2: 3-4 days
- Phase 3: 4-5 days
- Phase 4: 4-5 days
- Phase 5: 4-5 days
- Phase 6: 5-6 days
- Phase 7: 4-5 days
- Phase 8: 5-7 days

**Buffer Time:** 1-2 weeks for unexpected issues and refinements

---

## Notes

- Each phase builds on the previous one
- Test thoroughly after each phase before moving to next
- Prioritize voice interface responsiveness
- Keep API costs in mind (batch requests when possible)
- Maintain clear documentation throughout development
- Version control each completed phase

---

## Hosting & Deployment Guide

### Phase 8.5: Deployment Setup (Optional - Can be done anytime after Phase 0)

#### Step 8.5.1: Prepare for Deployment
- [ ] Set up GitHub repository
- [ ] Create `.env.example` file (without actual keys)
- [ ] Add `.env` to `.gitignore`
- [ ] Create `netlify.toml` for frontend config
- [ ] Create `railway.json` or setup instructions for backend

#### Step 8.5.2: Frontend Deployment (Netlify)
- [ ] Create Netlify account
- [ ] Connect GitHub repository
- [ ] Set build command: `npm run build`
- [ ] Set publish directory: `build` or `dist`
- [ ] Add environment variables (API endpoints)
- [ ] Deploy and test

#### Step 8.5.3: Backend Deployment (Railway)
- [ ] Create Railway account
- [ ] Connect GitHub repository
 - [ ] Add PostgreSQL database service
- [ ] Set up environment variables:
  - `GEMINI_API_KEY`
  - `OPENAI_API_KEY`
  - `DATABASE_URL`
  - `FRONTEND_URL` (for CORS)
- [ ] Deploy backend
- [ ] Update frontend API endpoint to Railway URL

#### Step 8.5.4: Database Migration
 - [ ] Run database schema on Railway PostgreSQL
- [ ] Test database connections
- [ ] Verify all tables created

#### Step 8.5.5: Post-Deployment Testing
- [ ] Test frontend can connect to backend
- [ ] Test voice interface in production
- [ ] Test camera access (HTTPS required)
- [ ] Test AI API integrations
- [ ] Monitor logs for errors

### Free Hosting Limits to Consider:

**Netlify:**
- 100GB bandwidth/month
- Unlimited sites (but check fine print)
- Auto SSL included

**Railway:**
- $5 credit/month on free tier
- Sleeps after inactivity (cold start delay)
- Shared resources
 - PostgreSQL included

**Important:** Test locally first, deploy when MVP is ready for demo!

