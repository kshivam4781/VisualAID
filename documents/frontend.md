# VisualAID Frontend Technical Documentation

## Overview

The VisualAID frontend is a React-based web application built with TypeScript, Vite, and modern web technologies. It provides a comprehensive vision assistance interface with real-time voice navigation, camera integration, and conversational AI capabilities.

## Technology Stack

### Core Technologies
- **React 19.1.1** - Modern React with latest features
- **TypeScript 5.9.3** - Type safety and enhanced development experience
- **Vite 7.1.7** - Fast build tool and development server
- **React Router DOM 7.9.4** - Client-side routing
- **Socket.IO Client 4.8.1** - Real-time communication with backend

### Development Tools
- **ESLint 9.36.0** - Code linting and quality
- **TypeScript ESLint** - TypeScript-specific linting rules
- **React Hooks ESLint Plugin** - React hooks best practices

## Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   ├── hooks/               # Custom React hooks
│   ├── pages/               # Page components
│   ├── services/            # External service integrations
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions
│   ├── config/              # Configuration files
│   └── assets/              # Static assets
├── public/                  # Public static files
├── package.json             # Dependencies and scripts
├── vite.config.ts          # Vite configuration
└── tsconfig.json           # TypeScript configuration
```

## Core Components

### 1. App.tsx
**Purpose**: Main application component and routing setup
**Key Features**:
- React Router configuration
- Voice navigation wrapper
- Route definitions for all pages
- Authentication flow integration

**Routes**:
- `/` - HomePage (main interface)
- `/about` - AboutPage (company information)
- `/use-case` - UseCasePage (feature examples)
- `/signin` - SignInPage (user authentication)
- `/signup` - SignUpPage (user registration)

### 2. VoiceNavigation.tsx
**Purpose**: Global voice navigation wrapper for all pages
**Key Features**:
- Voice command processing
- Audio queue management
- Keyboard shortcuts (Ctrl+V, Ctrl+R)
- Idle detection for tooltips
- Voice indicator display

**Props**:
- `children`: React nodes to wrap
- `autoReadOnMount`: Auto-read page content on mount
- `showVoiceIndicator`: Show voice activity indicator

**Voice Commands**:
- Navigation commands ("go to", "navigate to")
- Page reading ("read this page", "describe this page")
- Help commands ("navigation help")

### 3. HomePage.tsx
**Purpose**: Main application interface with vision capabilities
**Key Features**:
- Camera access and management
- Real-time frame capture
- WebSocket communication
- Conversation system integration
- Vision mode activation

**State Management**:
- Camera state (active/inactive)
- WebSocket connection status
- Session management
- Frame capture state
- Conversation state

### 4. HeroAgent.tsx
**Purpose**: Interactive hero section with voice activation
**Key Features**:
- Click-to-activate listening
- Visual feedback for speaking/listening states
- Camera status display
- Transcript display

## Custom Hooks

### 1. useConversation.ts
**Purpose**: Manages conversational AI interactions
**Key Features**:
- Speech recognition integration
- OpenAI Realtime API communication
- Frame analysis integration
- Audio queue management
- Vision mode activation/deactivation

**State**:
- `isActive`: Conversation session status
- `isListening`: Speech recognition status
- `isSpeaking`: TTS playback status
- `transcript`: Current speech transcript
- `visionModeActive`: Vision system status

### 2. useVoiceCommandHandler.ts
**Purpose**: Processes voice commands for navigation
**Key Features**:
- Command pattern matching
- Navigation execution
- Page content reading
- Help system integration

**Command Types**:
- Navigation commands
- Page reading commands
- Help commands
- Special case handling

### 3. useAudioQueue.ts
**Purpose**: Centralized audio playback management
**Key Features**:
- Priority-based queue system
- Interrupt support for urgent messages
- Single audio element management
- TTS integration

**Priority Levels**:
- `urgent`: Safety alerts, interruptions
- `high`: Important notifications
- `normal`: Regular responses
- `low`: Background information

### 4. useCameraAccess.ts
**Purpose**: Camera permission and stream management
**Key Features**:
- Camera permission handling
- Stream configuration
- Error handling
- Video element attachment

**Configuration**:
- Resolution: 1280x720
- Frame rate: 30fps
- Facing mode: environment (rear camera)

### 5. useFrameCapture.ts
**Purpose**: Real-time frame capture and processing
**Key Features**:
- Canvas-based frame extraction
- Base64 encoding
- Metadata generation
- WebSocket transmission

**Settings**:
- Capture interval: 15 seconds
- Quality: 0.7 (70%)
- Max dimensions: 640x480
- Format: JPEG

### 6. useSessionManagement.ts
**Purpose**: Vision session lifecycle management
**Key Features**:
- Session start/end
- Frame count tracking
- Metadata management
- WebSocket integration

## Services

### 1. websocket.ts
**Purpose**: WebSocket communication service
**Key Features**:
- Connection management
- Frame data transmission
- Session management
- Error handling and reconnection

**Methods**:
- `connect()`: Establish WebSocket connection
- `sendFrame()`: Send frame data to backend
- `startVisionSession()`: Initialize vision session
- `endVisionSession()`: Terminate session

## Type Definitions

### 1. voice.ts
**Purpose**: Voice-related type definitions
**Types**:
- `VoiceCommand`: Command structure
- `AudioQueueItem`: Audio queue item structure
- `ConversationState`: Conversation state interface

### 2. camera.ts
**Purpose**: Camera-related type definitions
**Types**:
- `CameraConfig`: Camera configuration
- `CameraState`: Camera state interface
- `FrameMetadata`: Frame capture metadata

### 3. menu.ts
**Purpose**: Navigation menu types
**Types**:
- `MenuContext`: Menu navigation context
- `PageContent`: Page content structure

## Utility Functions

### 1. commandParser.ts
**Purpose**: Voice command parsing utilities
**Functions**:
- Command pattern matching
- Parameter extraction
- Command validation

### 2. voiceCommandParser.ts
**Purpose**: Advanced voice command processing
**Functions**:
- Natural language processing
- Context-aware parsing
- Command execution

### 3. greetings.ts
**Purpose**: Greeting and response templates
**Functions**:
- Dynamic greeting generation
- Context-aware responses
- Localization support

## Configuration

### 1. voice.ts
**Purpose**: Voice system configuration
**Settings**:
- Speech recognition parameters
- TTS configuration
- Audio quality settings

### 2. vite.config.ts
**Purpose**: Vite build configuration
**Features**:
- React plugin integration
- Development server settings
- Build optimization

## Styling

### CSS Architecture
- **Component-scoped styles**: Each component has its own CSS file
- **CSS Modules**: Scoped styling to prevent conflicts
- **Responsive design**: Mobile-first approach
- **Accessibility**: High contrast and screen reader support

### Key Style Files
- `App.css`: Global application styles
- `index.css`: Base styles and CSS reset
- Component-specific CSS files for each major component

## State Management

### Local State
- React hooks for component-level state
- Custom hooks for shared state logic
- Context API for global state where needed

### State Flow
1. **User Interaction** → Component state update
2. **Hook Processing** → Business logic execution
3. **Service Communication** → Backend API calls
4. **State Synchronization** → UI updates

## Error Handling

### Error Boundaries
- React error boundaries for component errors
- Graceful degradation for failed features
- User-friendly error messages

### Error Types
- **Network errors**: WebSocket connection issues
- **Permission errors**: Camera/microphone access
- **API errors**: Backend service failures
- **Validation errors**: Input validation failures

## Performance Optimizations

### Code Splitting
- Route-based code splitting
- Lazy loading of non-critical components
- Dynamic imports for heavy dependencies

### Memory Management
- Proper cleanup in useEffect hooks
- Audio queue management
- WebSocket connection cleanup

### Rendering Optimization
- React.memo for expensive components
- useCallback for stable function references
- useMemo for expensive calculations

## Accessibility Features

### Screen Reader Support
- ARIA labels and descriptions
- Semantic HTML structure
- Focus management

### Keyboard Navigation
- Tab navigation support
- Keyboard shortcuts
- Focus indicators

### Voice Navigation
- Voice command system
- Audio feedback
- Spoken content descriptions

## Browser Compatibility

### Supported Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Required APIs
- WebRTC (camera access)
- Web Speech API (voice recognition)
- WebSocket API (real-time communication)
- Canvas API (frame processing)

## Development Workflow

### Scripts
- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run lint`: Run ESLint
- `npm run preview`: Preview production build

### Environment Variables
- `VITE_BACKEND_URL`: Backend server URL
- `VITE_WS_URL`: WebSocket server URL

## Testing Strategy

### Unit Testing
- Component testing with React Testing Library
- Hook testing with custom test utilities
- Service testing with mock implementations

### Integration Testing
- WebSocket communication testing
- Camera integration testing
- Voice command flow testing

## Deployment

### Build Process
1. TypeScript compilation
2. Vite bundling and optimization
3. Asset optimization
4. Static file generation

### Production Considerations
- Environment variable configuration
- CDN integration for static assets
- Service worker for offline functionality
- Performance monitoring

## Security Considerations

### Data Protection
- No sensitive data in client-side storage
- Secure WebSocket connections (WSS in production)
- Input validation and sanitization

### Privacy
- Camera permission handling
- Audio data processing
- User consent management

## Future Enhancements

### Planned Features
- Progressive Web App (PWA) support
- Offline functionality
- Advanced voice commands
- Multi-language support
- Enhanced accessibility features

### Technical Improvements
- Performance monitoring
- Error tracking
- Analytics integration
- Automated testing
- CI/CD pipeline

## Troubleshooting

### Common Issues
1. **Camera not working**: Check browser permissions
2. **Voice commands not recognized**: Verify microphone access
3. **WebSocket connection failed**: Check backend server status
4. **Audio not playing**: Verify audio permissions and browser support

### Debug Tools
- Browser developer tools
- React Developer Tools
- WebSocket debugging
- Console logging for troubleshooting

## API Integration

### Backend Communication
- RESTful API calls for data operations
- WebSocket for real-time communication
- File upload for frame data
- Authentication endpoints

### External Services
- OpenAI API for conversational AI
- Gemini API for vision analysis
- TTS services for audio generation

This documentation provides a comprehensive overview of the VisualAID frontend architecture, components, and implementation details. It serves as a reference for developers working on the project and helps maintain consistency across the codebase.
