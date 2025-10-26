# VisualAID Backend Technical Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [API Routes](#api-routes)
5. [Services](#services)
6. [Real-time Processing](#real-time-processing)
7. [Configuration](#configuration)
8. [Deployment](#deployment)
9. [Performance Optimizations](#performance-optimizations)
10. [Security](#security)

---

## Overview

VisualAID is a sophisticated AI-powered vision assistance application designed for visually impaired users. The backend provides real-time computer vision analysis, conversational AI, and safety features through a comprehensive Node.js/Express server with WebSocket support.

### Key Features
- **Real-time Vision Analysis**: GPT-4o powered scene understanding
- **Voice-to-Voice Conversation**: OpenAI Realtime API integration
- **Safety Alert System**: Critical obstacle detection and notifications
- **Session Management**: Real-time tracking of vision sessions
- **Multi-AI Support**: OpenAI and Google Gemini integration
- **Text-to-Speech**: Natural voice synthesis for responses

---

## Architecture

### Technology Stack
- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js 4.18.2
- **Real-time**: Socket.io 4.7.2
- **Database**: PostgreSQL (Supabase hosted)
- **AI Services**: OpenAI GPT-4o, Google Gemini 2.0 Flash
- **TTS**: OpenAI Text-to-Speech
- **Deployment**: Railway, Docker

### Core Components

```
backend/
├── src/
│   ├── server.js              # Main server entry point
│   ├── config/
│   │   └── database.js        # Database connection & pooling
│   ├── models/                # Database models
│   │   ├── user.js
│   │   ├── sessionFrame.js
│   │   ├── dangerAlert.js
│   │   ├── emergencyContact.js
│   │   └── userNote.js
│   ├── routes/                # API endpoints
│   │   ├── health.js
│   │   ├── users.js
│   │   ├── frames.js
│   │   ├── sessions.js
│   │   ├── gemini-test.js
│   │   ├── openai-test.js
│   │   ├── tts-test.js
│   │   ├── tts.js
│   │   └── cache-stats.js
│   ├── services/              # Business logic
│   │   ├── openaiService.js
│   │   ├── openaiRealtimeService.js
│   │   ├── openaiTTSService.js
│   │   ├── fastScanService.js
│   │   ├── responseCacheService.js
│   │   ├── geminiService.js
│   │   └── geminiConversationService.js
│   └── utils/
│       └── frameStorage.js    # File system utilities
├── frames/                    # Local frame storage
├── package.json
└── .env                       # Environment variables
```

---

## Database Schema

### PostgreSQL Database (Supabase)

#### Core Tables

**1. users**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**2. active_sessions**
```sql
CREATE TABLE active_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    frame_count INTEGER DEFAULT 0,
    session_data JSONB
);
```

**3. session_frames**
```sql
CREATE TABLE session_frames (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    frame_url TEXT,
    analysis JSONB,
    obstacles JSONB,
    detection_confidence DECIMAL(5,2),
    frame_number INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**4. danger_alerts**
```sql
CREATE TABLE danger_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID,
    frame_url VARCHAR(500),
    alert_type VARCHAR(50),
    severity VARCHAR(20),
    alert_data JSONB,
    sent_to VARCHAR(255),
    is_resolved BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);
```

**5. emergency_contacts**
```sql
CREATE TABLE emergency_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**6. user_notes**
```sql
CREATE TABLE user_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    location_tag VARCHAR(255),
    image_url VARCHAR(500),
    note_type VARCHAR(50),
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Database Features
- **Comprehensive Indexing**: Optimized for all query patterns
- **JSONB Columns**: Flexible storage for AI analysis data
- **Helper Functions**: `get_recent_frames()`, `get_active_sessions_count()`
- **Views**: `user_dashboard`, `recent_alerts`
- **Triggers**: Auto-update timestamps
- **Full-text Search**: On user notes

---

## API Routes

### Core Endpoints

#### Health & Testing
- `GET /api/health` - Server health check
- `GET /api/test-db/connection` - Database connection test
- `GET /api/test-db/crud` - Full CRUD operations test

#### User Management
- `GET /api/users` - List users (with pagination)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

#### Frame Management
- `GET /api/frames/session/:sessionId` - Get frames for session
- `GET /api/frames/:frameId` - Get specific frame
- `DELETE /api/frames/cleanup/:daysOld` - Cleanup old frames

#### Session Management
- `GET /api/sessions/active` - Get active sessions
- `GET /api/sessions/:sessionId` - Get session details
- `GET /api/sessions/user/:userId` - Get user sessions
- `GET /api/sessions/:sessionId/stats` - Get session statistics
- `DELETE /api/sessions/cleanup/:daysOld` - Cleanup old sessions

#### AI Testing
- `GET /api/gemini-test/connection` - Test Gemini API
- `POST /api/gemini-test/analyze` - Test frame analysis
- `GET /api/openai-test` - Test OpenAI API
- `GET /api/tts-test` - Test TTS functionality
- `POST /api/tts-test/speak` - Generate test speech

#### Text-to-Speech
- `POST /api/tts` - Generate speech (returns MP3)
- `POST /api/tts/base64` - Generate speech (returns base64)

#### Cache Management
- `GET /api/cache/stats` - Get cache statistics
- `POST /api/cache/clean` - Clean expired cache
- `POST /api/cache/clear` - Clear entire cache
- `POST /api/cache/init` - Re-initialize cache

---

## Services

### 1. OpenAI Service (`openaiService.js`)

**Core Function**: `analyzeFrame(base64Image, metadata, previousAnalysis)`

**Features**:
- **Dual Analysis Mode**: First frame vs subsequent frames
- **Camera Orientation Detection**: Upward/downward/tilted/forward
- **Motion Detection**: User movement vs object movement
- **Focused Object Analysis**: 30%+ frame coverage detection
- **Critical Obstacle Detection**: High/critical urgency filtering
- **Voice Description Generation**: Natural language output

**Analysis Structure**:
```javascript
{
  canSee: boolean,
  visibilityMessage: string,
  cameraOrientation: {
    direction: "upward|downward|tilted|forward",
    confidence: "high|medium|low",
    needsAdjustment: boolean,
    adjustmentMessage: string
  },
  sceneDescription: string,
  environmentType: string,
  focusedObject: {
    detected: boolean,
    type: "person|object",
    name: string,
    coveragePercentage: string,
    text: string,
    description: string,
    facialExpression: string,
    emotion: string,
    bodyLanguage: string,
    actions: string,
    eyeContact: string
  },
  obstacles: [{
    name: string,
    position: "left|center|right",
    distance: string,
    urgency: "low|medium|high|critical",
    action: string
  }],
  movingObjects: [{
    name: string,
    direction: string,
    speed: "slow|moderate|fast",
    distance: string,
    isApproaching: boolean,
    safetyLevel: "safe|caution|danger"
  }],
  pathStatus: "clear|caution|blocked",
  navigationGuidance: string
}
```

### 2. OpenAI Realtime Service (`openaiRealtimeService.js`)

**Features**:
- **WebSocket Connection**: Direct connection to OpenAI Realtime API
- **Audio Streaming**: PCM16 format audio processing
- **Frame Context Integration**: Visual data in conversation
- **Urgent Alert System**: Interrupts ongoing responses
- **Voice Command Parsing**: Natural language command processing

**Session Management**:
```javascript
class OpenAIRealtimeSession {
  constructor(sessionId, clientSocket)
  async connect()
  sendAudio(audioBase64)
  updateFrameContext(frameAnalysis)
  sendUrgentAlert(message)
  speakText(text)
  async parseCommand(prompt)
  disconnect()
}
```

### 3. OpenAI TTS Service (`openaiTTSService.js`)

**Features**:
- **Multiple Voices**: alloy, echo, fable, onyx, nova, shimmer
- **Context-Aware Selection**: Automatic voice selection
- **Base64 Output**: WebSocket-compatible audio format
- **Speed Control**: 0.25x to 4.0x speed adjustment
- **Model Selection**: tts-1 (fast) or tts-1-hd (quality)

**Functions**:
```javascript
textToSpeech(text, options) // Returns Buffer
textToSpeechBase64(text, options) // Returns base64 string
testTTS() // Test API connection
getVoiceForContext(context) // Context-aware voice selection
```

### 4. Fast Scan Service (`fastScanService.js`)

**Purpose**: Ultra-fast danger detection (0.5-1 second response)

**Features**:
- **GPT-4o-mini**: Faster, cheaper model for quick scans
- **Immediate Safety Alerts**: Critical danger detection
- **Smart Acknowledgements**: Contextual immediate responses
- **Streaming Chunks**: Priority-based response delivery

**Functions**:
```javascript
quickDangerScan(base64Image, metadata) // Returns quick safety assessment
getImmediateAck(frameCount, lastEnvironment) // Returns immediate ack
generateStreamingChunks(analysis) // Returns prioritized chunks
```

### 5. Response Cache Service (`responseCacheService.js`)

**Features**:
- **Scenario-Based Caching**: Common situation responses
- **TTL Management**: 5-minute cache expiration
- **Cache Statistics**: Hit/miss ratio tracking
- **Pre-populated Scenarios**: Common hallway/room/outdoor responses

**Functions**:
```javascript
getCachedResponse(analysis) // Check cache
cacheResponse(analysis, response) // Store response
cleanExpiredCache() // Cleanup
getCacheStats() // Statistics
initializeCommonScenarios() // Pre-populate
```

### 6. Gemini Services

**Gemini Service** (`geminiService.js`):
- Alternative AI provider using Google Gemini 2.0 Flash
- Similar analysis capabilities to OpenAI service
- Cost-effective option for development/testing

**Gemini Conversation Service** (`geminiConversationService.js`):
- Conversational AI with Nova personality
- Natural conversation handling
- Vision mode activation detection
- Streaming response support

---

## Real-time Processing

### WebSocket Events

#### Client → Server Events
- `session:start` - Start vision session
- `session:end` - End vision session
- `frame:capture` - Send captured frame
- `frame:capture_now` - On-demand frame capture
- `frame:capture_immediate` - Immediate frame capture
- `voice:command` - Voice command processing
- `realtime:start` - Start OpenAI Realtime session
- `realtime:audio` - Send audio to Realtime API
- `realtime:stop` - Stop Realtime session
- `realtime:message` - Send text message
- `realtime:parse_command` - Parse voice command
- `realtime:execute_command` - Execute parsed command
- `conversation:start` - Start conversation session
- `conversation:message` - Send conversation message
- `conversation:end` - End conversation
- `user:question` - Handle user questions

#### Server → Client Events
- `session:started` - Session started confirmation
- `session:ended` - Session ended confirmation
- `frame:captured` - Frame saved confirmation
- `frame:quick_scan` - Fast scan results
- `frame:analyzed` - Full analysis results
- `frame:audio` - TTS audio data
- `frame:no_changes` - No significant changes detected
- `frame:analysis_error` - Analysis failed
- `voice:command_response` - Command execution result
- `realtime:connected` - Realtime session connected
- `realtime:audio_delta` - Streaming audio chunks
- `realtime:ai_transcript` - AI speech transcript
- `realtime:command_parsed` - Command parsing result
- `conversation:started` - Conversation started
- `conversation:response` - AI response with audio
- `conversation:error` - Conversation error
- `question:answer` - Question response with audio

### Processing Pipeline

#### Frame Capture Flow
1. **Frontend** captures frame → **WebSocket** → **Backend**
2. **Immediate acknowledgement** sent to user
3. **Frame saved** to local filesystem (`backend/frames/`)
4. **Parallel processing**:
   - **Fast scan** (0.5-1s) → Immediate safety alerts
   - **Full analysis** (2-3s) → Comprehensive description
5. **TTS generation** → Audio sent to frontend
6. **Database storage** → Analysis and metadata saved
7. **Danger alerts** → Critical obstacles logged

#### Voice Command Flow
1. **User speaks** → **Frontend** → **WebSocket**
2. **Command parsing** → **OpenAI Realtime API**
3. **Action execution** → **Vision activation/analysis**
4. **Response generation** → **TTS** → **Audio playback**

---

## Configuration

### Environment Variables

#### Database Configuration
```bash
DATABASE_URL=postgresql://username:password@host:port/database
DB_HOST=your-supabase-host
DB_PORT=6543
DB_NAME=postgres
DB_USER=your-supabase-user
DB_PASSWORD=your-supabase-password
```

#### AI API Keys
```bash
OPENAI_API_KEY=your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key
VAPI_API_KEY=your-vapi-api-key
```

#### Application Configuration
```bash
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
BACKEND_PORT=3000
```

#### Supabase Configuration
```bash
SUPABASE_PROJECT_REF=aaepdorqqabhscowpidz
SUPABASE_REGION=us-east-2
SUPABASE_URL=https://aaepdorqqabhscowpidz.supabase.co
```

### Database Connection Pool
```javascript
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  max: 5, // Supabase free tier limit
  min: 0,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 20000,
  statement_timeout: 20000,
  allowExitOnIdle: true
});
```

---

## Deployment

### Railway Deployment

#### Configuration Files
- **`railway.json`**: Railway-specific configuration
- **`Dockerfile`**: Container configuration
- **`Procfile`**: Process definition
- **`nixpacks.toml`**: Alternative build system

#### Railway Configuration
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "node src/server.js",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### Docker Configuration
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/ ./
EXPOSE 3000
CMD ["node", "src/server.js"]
```

### Deployment Scripts
- **`deploy-to-railway.bat`**: Windows deployment script
- **`deploy-to-railway.sh`**: Unix deployment script

### Production Environment
- **Backend**: Railway (Node.js + PostgreSQL)
- **Frontend**: Netlify (React + Vite)
- **Database**: Supabase (PostgreSQL with pooling)
- **AI Services**: OpenAI + Google Gemini
- **CDN**: Railway's built-in CDN

---

## Performance Optimizations

### Database Optimizations
- **Connection Pooling**: Supabase pooler mode for IPv4 compatibility
- **Comprehensive Indexing**: All query patterns optimized
- **JSONB Columns**: Efficient storage for AI analysis data
- **Helper Functions**: Pre-compiled common queries
- **Views**: Optimized dashboard queries

### Application Optimizations
- **Response Caching**: Common scenario caching
- **Parallel Processing**: Fast scan + full analysis
- **Streaming Responses**: Chunked audio delivery
- **Memory Management**: Session cleanup and garbage collection
- **Error Handling**: Graceful degradation on failures

### AI Service Optimizations
- **Model Selection**: GPT-4o-mini for fast scans, GPT-4o for analysis
- **Prompt Engineering**: Optimized prompts for speed and accuracy
- **Context Management**: Efficient frame comparison
- **Caching**: Common response patterns cached

### Real-time Optimizations
- **WebSocket Management**: Efficient connection handling
- **Audio Streaming**: Chunked PCM16 audio delivery
- **Event Batching**: Grouped event processing
- **Memory Cleanup**: Automatic session cleanup

---

## Security

### Data Protection
- **Environment Variables**: Sensitive data in .env files
- **Database Security**: SSL connections with Supabase
- **API Key Management**: Secure storage and rotation
- **Input Validation**: All inputs validated and sanitized

### Access Control
- **CORS Configuration**: Restricted frontend access
- **Session Management**: Secure session handling
- **User Authentication**: Password hashing and validation
- **Emergency Contacts**: Secure contact information storage

### Privacy Features
- **Local Frame Storage**: Frames stored locally, not in cloud
- **Analysis Data**: AI analysis stored in database with user consent
- **Session Cleanup**: Automatic cleanup of old sessions
- **Data Retention**: Configurable data retention policies

### Error Handling
- **Graceful Degradation**: App continues working if AI services fail
- **Error Logging**: Comprehensive error tracking
- **Fallback Responses**: Safe responses when services unavailable
- **Health Checks**: Continuous service monitoring

---

## Monitoring & Maintenance

### Health Monitoring
- **Health Check Endpoint**: `/api/health`
- **Database Connection**: Continuous monitoring
- **AI Service Status**: API availability checks
- **Performance Metrics**: Response time tracking

### Maintenance Tasks
- **Frame Cleanup**: Automatic old frame deletion
- **Session Cleanup**: Inactive session removal
- **Cache Management**: Expired cache cleanup
- **Database Optimization**: Regular maintenance

### Logging
- **Request Logging**: All API requests logged
- **Error Logging**: Comprehensive error tracking
- **Performance Logging**: Response time monitoring
- **AI Service Logging**: API call tracking

---

## Development

### Local Development
```bash
cd backend
npm install
npm run dev  # Development with auto-reload
npm start    # Production mode
```

### Testing
- **Database Tests**: `/api/test-db/connection`
- **AI Service Tests**: `/api/gemini-test`, `/api/openai-test`
- **TTS Tests**: `/api/tts-test`
- **Integration Tests**: Full CRUD operations

### Debugging
- **Console Logging**: Comprehensive debug output
- **Error Tracking**: Detailed error information
- **Performance Monitoring**: Response time tracking
- **Database Queries**: Query performance monitoring

---

This backend represents a production-ready, enterprise-grade vision assistance application with sophisticated AI integration, real-time processing capabilities, comprehensive safety features, and scalable architecture. The system is designed for high availability, performance, and user safety.
