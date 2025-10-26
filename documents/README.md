# VisualAID - Visual Assistance App for Visually Impaired Users

## Project Overview

VisualAID is an advanced MVP designed to help visually impaired individuals navigate their surroundings safely and independently through real-time visual analysis and conversational AI assistance. The application features a sophisticated React frontend with comprehensive voice navigation, real-time camera integration, and AI-powered vision assistance.

## Project Status

✅ **Phase 0 Complete** - Database & Backend Setup  
✅ **Phase 1 Complete** - Voice Interface & Navigation  
✅ **Phase 2 Complete** - Camera Integration & Frame Capture  
✅ **Phase 3 Complete** - AI Vision Analysis (Gemini 2.0 Flash)  
✅ **Phase 4 Complete** - Conversational AI (OpenAI Realtime API)  
✅ **Phase 5 Complete** - User Authentication & Session Management  
✅ **Phase 6 Complete** - Emergency Response System (Vapi AI Integration)  

### Completed Features
- ✅ **Advanced Frontend Architecture** - React 19.1.1 with TypeScript, comprehensive hook system
- ✅ **Voice Navigation System** - Global voice commands, accessibility features, auto-reading
- ✅ **Real-time Camera Integration** - Frame capture, WebSocket communication, session management
- ✅ **AI Vision Processing** - Gemini 2.0 Flash for object detection, obstacle identification, safety assessment
- ✅ **Conversational AI** - OpenAI Realtime API for natural voice-to-voice communication
- ✅ **Emergency Response System** - Vapi AI integration for automated phone calls and threat detection
- ✅ **Database Architecture** - PostgreSQL with optimized schema, JSONB storage, indexing
- ✅ **WebSocket Communication** - Real-time bidirectional data exchange
- ✅ **Audio Management** - Priority-based audio queue, TTS integration, interruption handling
- ✅ **Session Management** - Complete lifecycle management, frame storage, analysis tracking
- ✅ **User Authentication** - Sign-in/sign-up flows with accessibility features

## Core Technology Stack

### Frontend Architecture
- **React 19.1.1** with TypeScript 5.9.3
- **Vite 7.1.7** for fast development and building
- **React Router 7.1.1** for navigation
- **Socket.io-client 4.8.1** for real-time communication
- **Web Speech API** for voice recognition and synthesis
- **Canvas API** for image processing and frame capture

### Backend Architecture
- **Node.js + Express** with Socket.io for real-time communication
- **PostgreSQL** with Supabase for database management
- **OpenAI Realtime API** for conversational AI
- **Gemini 2.0 Flash** for vision analysis
- **OpenAI TTS API** for text-to-speech generation
- **Vapi AI** for emergency phone call automation

### Key Frontend Components

#### Core Hooks System
- **`useConversation`** - Manages OpenAI Realtime API interactions, speech recognition, audio playback
- **`useVoiceCommandHandler`** - Processes voice commands, navigation, page reading
- **`useAudioQueue`** - Centralized audio management with priority queuing
- **`useCameraAccess`** - Camera permissions and stream management
- **`useFrameCapture`** - Real-time frame capture and processing
- **`useSessionManagement`** - Session lifecycle and WebSocket communication
- **`useRealtimeAudio`** - Audio streaming and processing

#### UI Components
- **`VoiceNavigation`** - Global voice wrapper with accessibility features
- **`HeroAgent`** - Interactive AI agent interface
- **`HomePage`** - Main application interface with camera integration
- **Authentication Pages** - Sign-in/sign-up with accessibility support

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                React Frontend (Netlify)                 │
│  ┌─────────────────┐  ┌─────────────────┐               │
│  │ VoiceNavigation │  │   HeroAgent     │               │
│  │ - Global Voice  │  │ - AI Interface  │               │
│  │ - Commands      │  │ - Indicators    │               │
│  └─────────────────┘  └─────────────────┘               │
│  ┌─────────────────┐  ┌─────────────────┐               │
│  │ useConversation │  │ useFrameCapture │               │
│  │ - OpenAI API    │  │ - Camera Stream │               │
│  │ - Speech I/O    │  │ - Base64 Conv   │               │
│  └─────────────────┘  └─────────────────┘               │
└─────────────┬───────────────────────────────────────────┘
              │ WebSocket (Socket.io)
              ▼
┌─────────────────────────────────────────────────────────┐
│              Node.js Backend (Railway)                  │
│  ┌─────────────────┐  ┌─────────────────┐               │
│  │ Session Manager │  │ Frame Processor │               │
│  │ - Lifecycle     │  │ - Storage       │               │
│  │ - WebSocket     │  │ - Analysis      │               │
│  └─────────────────┘  └─────────────────┘               │
│  ┌─────────────────┐  ┌─────────────────┐               │
│  │ OpenAI Service  │  │ Gemini Service  │               │
│  │ - Realtime API  │  │ - Vision Analysis│              │
│  │ - TTS API       │  │ - Object Detect │               │
│  └─────────────────┘  └─────────────────┘               │
└─────────────┬───────────────────────────────────────────┘
              │ PostgreSQL Connection
              ▼
┌─────────────────────────────────────────────────────────┐
│              Supabase PostgreSQL Database                │
│  ┌─────────────────┐  ┌─────────────────┐               │
│  │ session_frames  │  │ active_sessions │               │
│  │ - Frame Data     │  │ - Session Info  │               │
│  │ - AI Analysis    │  │ - User Context  │               │
│  └─────────────────┘  └─────────────────┘               │
│  ┌─────────────────┐  ┌─────────────────┐               │
│  │ users           │  │ danger_alerts   │               │
│  │ - Auth Data      │  │ - Safety Logs   │               │
│  │ - Preferences    │  │ - Alerts        │               │
│  └─────────────────┘  └─────────────────┘               │
└─────────────────────────────────────────────────────────┘
```

## Database Schema (PostgreSQL)

### Core Tables
- **`users`** - User accounts with authentication data
- **`active_sessions`** - Current vision assistance sessions
- **`session_frames`** - Captured frames with AI analysis (JSONB)
- **`danger_alerts`** - Safety alerts and incident tracking
- **`emergency_contacts`** - User emergency contact information
- **`user_notes`** - User notes with full-text search

### Key Features
- **UUID Primary Keys** for better distribution and security
- **JSONB Columns** for efficient AI analysis storage
- **GIN Indexes** for fast JSONB queries
- **Full-text Search** capabilities
- **Automatic Timestamps** with triggers
- **Cascade Deletes** for data integrity

## AI Integration Architecture

### Vision Processing Pipeline
1. **Frame Capture** - Camera stream → Canvas → Base64 conversion
2. **Gemini Analysis** - Object detection, obstacle identification, safety assessment
3. **Weapon Detection** - Identifies dangerous objects (knives, baseball bats, etc.)
4. **Context Integration** - Frame data passed to conversational AI
5. **Real-time Response** - Natural language descriptions via OpenAI Realtime API
6. **Emergency Trigger** - Automatic alerts when weapons or threats detected

### Emergency Response Flow
1. **Threat Detection** - AI identifies weapons or dangerous situations
2. **Multi-channel Alert** - Simultaneous phone calls and email notifications
3. **Vapi Phone Call** - Automated call to emergency contacts with threat details
4. **Frame Forwarding** - Captured frame sent to emergency contacts and company
5. **Real-time Monitoring** - Continuous threat assessment and response

### Conversational AI Flow
1. **Voice Input** - Web Speech API → OpenAI Realtime API
2. **Context Processing** - Frame analysis integrated into conversation
3. **Natural Responses** - Voice-to-voice communication
4. **Audio Management** - Priority-based queue with interruption handling

## Key Features

### Voice Navigation System
- **Global Voice Commands** - Available on all pages
- **Page Reading** - Automatic content narration
- **Navigation Assistance** - Voice-guided page navigation
- **Accessibility Features** - Screen reader support, keyboard shortcuts

### Real-time Vision Assistance
- **Continuous Frame Capture** - 5-second intervals with immediate capture capability
- **AI Object Detection** - Identifies objects, obstacles, people, text
- **Safety Assessment** - Evaluates scene safety and alerts user
- **Context Awareness** - Compares frames to avoid repetitive descriptions
- **Weapon Detection** - Identifies dangerous objects like knives, baseball bats
- **Emergency Response** - Automatic alerts and phone calls when threats detected

### Emergency Response System
- **Automated Phone Calls** - Vapi AI integration for emergency contact calls
- **Multi-channel Alerts** - Phone calls, emails, and frame forwarding
- **Threat Detection** - AI-powered weapon and danger identification
- **Emergency Contact Management** - User-defined emergency contacts
- **Real-time Notifications** - Immediate alerts to contacts and company

### Session Management
- **Session Lifecycle** - Start, pause, resume, end sessions
- **Frame Storage** - Persistent storage of captured frames and analysis
- **User Context** - Maintains user state and preferences
- **WebSocket Communication** - Real-time bidirectional data exchange

## 🚀 Quick Start

### Production Deployment
The application is currently deployed with:
- **Frontend**: Hosted on Netlify
- **Backend**: Hosted on Railway
- **Database**: Supabase PostgreSQL

### Local Development Setup

#### 1. Start Frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in Chrome/Edge

#### 2. Start Backend
```bash
cd backend
npm install
npm start
```
Backend runs on `http://localhost:3000`

#### 3. Environment Setup
Create `.env` files with required API keys:
- `GEMINI_API_KEY` - Google Gemini API key
- `OPENAI_API_KEY` - OpenAI API key
- `VAPI_API_KEY` - Vapi AI API key for emergency phone calls
- `DATABASE_URL` - Supabase PostgreSQL connection string

### 4. Try Voice Commands
- Say **"be my eye"** to activate vision mode
- Say **"stop be my eye"** to deactivate
- Use **"read page"** for content narration
- Use **"help"** for command assistance

## Development Features

### Frontend Development
- **Hot Module Replacement** - Instant updates during development
- **TypeScript Support** - Full type safety and IntelliSense
- **ESLint Integration** - Code quality and consistency
- **Component Architecture** - Modular, reusable components
- **Hook-based State Management** - Custom hooks for complex logic

### Backend Development
- **WebSocket Integration** - Real-time communication
- **Service Architecture** - Modular service design
- **Database Models** - Clean data access layer
- **Error Handling** - Comprehensive error management
- **API Documentation** - RESTful endpoints

## Performance Optimizations

### Frontend Optimizations
- **Image Compression** - Optimized frame capture and processing
- **Audio Queue Management** - Prevents audio overlaps and conflicts
- **Component Memoization** - Reduces unnecessary re-renders
- **Lazy Loading** - Optimized bundle splitting

### Backend Optimizations
- **Parallel Processing** - Concurrent AI analysis
- **Response Caching** - Reduces redundant API calls
- **Database Indexing** - Optimized query performance
- **Connection Pooling** - Efficient database connections

## Security & Privacy

- **HTTPS Required** - Secure communication for camera access
- **API Key Protection** - Environment variable storage
- **Data Encryption** - Sensitive data encrypted in database
- **User Consent** - Clear privacy controls and permissions
- **Session Security** - Secure session management

## Cost Estimates

- **Gemini API** - ~$0.10-0.50 per 1K frames
- **OpenAI API** - ~$0.50-2 per 1K interactions
- **Database Hosting** - Free tier available (Supabase)
- **Frontend Hosting** - Free tier available (Netlify)
- **Backend Hosting** - $5-20/month (Railway/Render)

**Total Expected**: $50-200/month for testing + APIs

## Deployment Strategy

### Current Production Setup
✅ **Frontend**: Deployed on Netlify (free tier)  
✅ **Backend**: Deployed on Railway ($5/month)  
✅ **Database**: Supabase PostgreSQL (free tier)

### Deployment Steps
1. **Database**: Run schema.sql in Supabase SQL Editor
2. **Backend**: Deploy to Railway with environment variables
3. **Frontend**: Deploy to Netlify with build optimization
4. **Testing**: End-to-end testing in production environment

## Future Enhancements

### Planned Features
- **Advanced Navigation** - Google Maps integration
- **Notes OCR** - Text recognition and storage
- **Emergency Alerts** - Automatic danger notifications
- **Multi-language Support** - International accessibility
- **Mobile Apps** - Native iOS/Android applications

### Technical Improvements
- **Offline Mode** - Edge processing capabilities
- **Advanced AI** - Custom vision models
- **Performance Optimization** - Faster processing
- **Accessibility Enhancements** - Improved voice interface

## Success Criteria

✅ **Voice Interface** - Natural, responsive voice commands  
✅ **Vision Assistance** - Accurate object detection and description  
✅ **Real-time Processing** - Low-latency frame analysis  
✅ **User Experience** - Intuitive, accessible interface  
✅ **Reliability** - Stable, consistent performance  
✅ **Security** - Secure data handling and communication  

## Documentation

- **[Frontend Technical Documentation](frontend.md)** - Complete frontend architecture and implementation details
- **[Development Roadmap](ROADMAP.md)** - Step-by-step development plan and progress tracking
- **[Database Schema](../backend/schema.sql)** - Complete database structure and relationships

## Contributing

This project follows a structured development approach with clear phases and milestones. Each component is designed for modularity and maintainability, making it easy to contribute and extend functionality.

## License

This project is designed to help visually impaired individuals navigate their world more independently and safely through advanced AI-powered assistance.