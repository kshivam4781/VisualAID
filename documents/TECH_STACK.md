# VisualAID Tech Stack Documentation

## Overview

VisualAID is built using modern web technologies with a focus on real-time communication, AI integration, and accessibility. The application follows a full-stack architecture with React frontend, Node.js backend, and PostgreSQL database.

---

## 🎯 Frontend Technology Stack

### Core Framework & Language
- **React 19.1.1** - Latest React with concurrent features and improved performance
- **TypeScript 5.9.3** - Type-safe JavaScript with strict configuration
- **Vite 7.1.7** - Fast build tool and development server
- **ES2022** - Modern JavaScript features and syntax

### UI & Styling
- **CSS3** - Custom styling with modern features
- **Responsive Design** - Mobile-first approach
- **Accessibility Features** - ARIA labels, keyboard navigation, screen reader support

### State Management & Hooks
- **React Hooks** - Functional component state management
- **Custom Hooks Architecture**:
  - `useConversation` - OpenAI Realtime API integration
  - `useVoiceCommandHandler` - Voice command processing
  - `useAudioQueue` - Priority-based audio management
  - `useCameraAccess` - Camera permissions and stream handling
  - `useFrameCapture` - Real-time frame capture and processing
  - `useSessionManagement` - Session lifecycle management
  - `useRealtimeAudio` - Audio streaming and processing
  - `useVoiceNavigation` - Global voice navigation
  - `useTextToSpeech` - Text-to-speech functionality

### Routing & Navigation
- **React Router DOM 7.9.4** - Client-side routing
- **Voice Navigation** - Global voice command system
- **Page Reading** - Automatic content narration

### Real-time Communication
- **Socket.io-client 4.8.1** - WebSocket communication with backend
- **WebSocket Service** - Centralized real-time data exchange
- **Event-driven Architecture** - Reactive communication patterns

### Browser APIs Integration
- **Web Speech API** - Voice recognition and synthesis
- **Canvas API** - Image processing and frame capture
- **MediaDevices API** - Camera access and stream handling
- **WebRTC** - Real-time communication capabilities

### Development Tools
- **ESLint 9.36.0** - Code linting and quality assurance
- **TypeScript ESLint** - TypeScript-specific linting rules
- **React Hooks ESLint Plugin** - Hooks-specific linting
- **Vite Plugin React** - React development optimization

---

## 🚀 Backend Technology Stack

### Core Runtime & Framework
- **Node.js 20 LTS** - JavaScript runtime environment
- **Express.js 4.18.2** - Web application framework
- **ES Modules** - Modern JavaScript module system
- **TypeScript Support** - Type-safe backend development

### Real-time Communication
- **Socket.io 4.7.2** - WebSocket library for real-time communication
- **WebSocket Server** - Bidirectional communication with frontend
- **Event-driven Architecture** - Reactive communication patterns

### Database & Data Management
- **PostgreSQL** - Primary database system
- **Supabase** - Database hosting and management
- **pg 8.16.3** - PostgreSQL client for Node.js
- **Connection Pooling** - Optimized database connections
- **JSONB Support** - Efficient JSON data storage

### AI & Machine Learning Integration
- **Google Generative AI 0.24.1** - Gemini 2.0 Flash integration
- **OpenAI 6.7.0** - GPT-4o and Realtime API integration
- **Vapi AI** - Voice agent platform for emergency phone calls
- **AI Service Architecture**:
  - `geminiService.js` - Vision analysis and object detection
  - `openaiRealtimeService.js` - Voice-to-voice communication
  - `openaiTTSService.js` - Text-to-speech generation
  - `fastScanService.js` - Optimized frame processing
  - `responseCacheService.js` - AI response caching
  - `vapiService.js` - Emergency phone call automation

### Emergency Response System
- **Vapi AI Integration** - Automated emergency phone calls
- **Weapon Detection** - AI-powered threat identification
- **Emergency Contact Management** - Automated notification system
- **Multi-channel Alerts**:
  - Phone calls to emergency contacts via Vapi
  - Email notifications to company and contacts
  - Frame forwarding with threat analysis
  - Real-time danger assessment

### Security & Middleware
- **CORS 2.8.5** - Cross-origin resource sharing
- **dotenv 16.3.1** - Environment variable management
- **SSL/TLS Support** - Secure database connections
- **Input Validation** - Data sanitization and validation

### Development & Deployment
- **Nodemon 3.0.1** - Development server with auto-restart
- **Docker** - Containerization for deployment
- **Railway** - Cloud deployment platform
- **Health Checks** - Application monitoring

---

## 🗄️ Database Technology Stack

### Database System
- **PostgreSQL** - Primary database engine
- **Supabase** - Managed PostgreSQL hosting
- **UUID Extension** - Unique identifier generation
- **JSONB** - Binary JSON for efficient storage

### Database Architecture
- **Connection Pooling** - Optimized connection management
- **SSL Connections** - Secure database communication
- **Indexing Strategy**:
  - B-tree indexes for common queries
  - GIN indexes for JSONB searches
  - Full-text search indexes
  - Composite indexes for complex queries

### Data Models
- **Users** - Authentication and user management
- **Active Sessions** - Real-time session tracking
- **Session Frames** - Captured frames with AI analysis
- **Danger Alerts** - Safety incident tracking with weapon detection
- **Emergency Contacts** - User emergency information with phone numbers
- **User Notes** - Personal notes with search capability
- **Emergency Call Logs** - Vapi call history and status tracking

### Database Features
- **Triggers** - Automatic timestamp updates
- **Cascade Deletes** - Referential integrity
- **Views** - Optimized query interfaces
- **Helper Functions** - Common database operations

---

## ☁️ Cloud & Deployment Stack

### Frontend Hosting
- **Netlify** - Static site hosting
- **Vite Build** - Optimized production builds
- **CDN** - Global content delivery
- **HTTPS** - Secure communication

### Backend Hosting
- **Railway** - Node.js application hosting
- **Docker Containers** - Containerized deployment
- **Auto-scaling** - Dynamic resource allocation
- **Health Monitoring** - Application health checks

### Database Hosting
- **Supabase** - Managed PostgreSQL hosting
- **Connection Pooling** - Optimized connections
- **Backup & Recovery** - Data protection
- **Monitoring** - Performance tracking

### Environment Management
- **Environment Variables** - Secure configuration
- **API Key Management** - Secure credential storage
- **Configuration Files** - Deployment settings

---

## 🔧 Development Tools & Workflow

### Version Control
- **Git** - Source code management
- **GitHub** - Repository hosting and collaboration

### Build Tools
- **Vite** - Frontend build tool
- **TypeScript Compiler** - Type checking and compilation
- **ESLint** - Code quality and consistency

### Testing & Quality
- **TypeScript** - Static type checking
- **ESLint** - Code linting and formatting
- **Manual Testing** - User experience validation

### Development Environment
- **Hot Module Replacement** - Instant development updates
- **Source Maps** - Debugging support
- **Development Servers** - Local development setup

---

## 📱 Browser & Platform Support

### Browser Compatibility
- **Chrome/Chromium** - Primary browser support
- **Edge** - Microsoft Edge support
- **Safari** - WebKit-based browsers
- **Firefox** - Gecko-based browsers

### Required Features
- **Web Speech API** - Voice recognition and synthesis
- **Canvas API** - Image processing
- **WebSocket** - Real-time communication
- **MediaDevices API** - Camera access
- **HTTPS** - Secure context for camera access

### Mobile Support
- **Responsive Design** - Mobile-friendly interface
- **Touch Events** - Touch-based interactions
- **Mobile Camera** - Device camera integration

---

## 🔒 Security & Privacy

### Data Security
- **HTTPS** - Encrypted communication
- **Environment Variables** - Secure credential storage
- **Input Validation** - Data sanitization
- **SQL Injection Prevention** - Parameterized queries

### Privacy Features
- **Local Processing** - Minimal cloud data transfer
- **User Consent** - Clear privacy controls
- **Data Encryption** - Sensitive data protection
- **Session Management** - Secure session handling

### API Security
- **API Key Protection** - Secure API access
- **Rate Limiting** - API usage protection
- **CORS Configuration** - Cross-origin security

---

## 📊 Performance & Optimization

### Frontend Optimization
- **Code Splitting** - Optimized bundle loading
- **Image Compression** - Efficient image processing
- **Audio Queue Management** - Smooth audio playback
- **Component Memoization** - Reduced re-renders

### Backend Optimization
- **Connection Pooling** - Efficient database connections
- **Response Caching** - Reduced API calls
- **Parallel Processing** - Concurrent AI analysis
- **Memory Management** - Optimized resource usage

### Database Optimization
- **Indexing** - Fast query performance
- **JSONB Storage** - Efficient JSON handling
- **Query Optimization** - Optimized database queries
- **Connection Management** - Efficient connection usage

---

## 🚀 Future Technology Considerations

### Planned Upgrades
- **React 19 Features** - Latest React capabilities
- **WebAssembly** - Performance-critical operations
- **Service Workers** - Offline functionality
- **Progressive Web App** - Enhanced mobile experience

### AI Enhancements
- **Custom Models** - Specialized vision models
- **Edge Computing** - Local AI processing
- **Multi-modal AI** - Enhanced AI capabilities
- **Real-time Optimization** - Improved AI performance

### Infrastructure Improvements
- **Microservices** - Scalable architecture
- **CDN Integration** - Global content delivery
- **Monitoring & Analytics** - Performance tracking
- **Automated Testing** - Quality assurance

---

## 📋 Technology Dependencies Summary

### Frontend Dependencies
```json
{
  "react": "^19.1.1",
  "react-dom": "^19.1.1",
  "react-router-dom": "^7.9.4",
  "socket.io-client": "^4.8.1"
}
```

### Backend Dependencies
```json
{
  "@google/generative-ai": "^0.24.1",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "express": "^4.18.2",
  "openai": "^6.7.0",
  "pg": "^8.16.3",
  "socket.io": "^4.7.2",
  "vapi": "^1.0.0"
}
```

### Development Dependencies
```json
{
  "@eslint/js": "^9.36.0",
  "@types/node": "^24.6.0",
  "@types/react": "^19.1.16",
  "@types/react-dom": "^19.1.9",
  "@vitejs/plugin-react": "^5.0.4",
  "eslint": "^9.36.0",
  "eslint-plugin-react-hooks": "^5.2.0",
  "eslint-plugin-react-refresh": "^0.4.22",
  "globals": "^16.4.0",
  "typescript": "~5.9.3",
  "typescript-eslint": "^8.45.0",
  "vite": "^7.1.7",
  "nodemon": "^3.0.1"
}
```

---

## 🎯 Technology Stack Benefits

### Performance Benefits
- **Fast Development** - Vite and modern tooling
- **Real-time Communication** - WebSocket and Socket.io
- **Optimized AI Processing** - Efficient API integration
- **Responsive UI** - React 19 and modern CSS

### Developer Experience
- **Type Safety** - TypeScript throughout
- **Hot Reloading** - Instant development feedback
- **Code Quality** - ESLint and best practices
- **Modular Architecture** - Maintainable codebase

### User Experience
- **Accessibility** - Voice navigation and screen reader support
- **Real-time Feedback** - Immediate AI responses
- **Cross-platform** - Web-based accessibility
- **Intuitive Interface** - Voice-first design

### Scalability
- **Cloud-ready** - Railway and Supabase integration
- **Containerized** - Docker deployment
- **Database Optimization** - PostgreSQL with indexing
- **API Integration** - Modular AI services

This comprehensive tech stack provides a solid foundation for building and scaling VisualAID as a modern, accessible, and AI-powered visual assistance application.
