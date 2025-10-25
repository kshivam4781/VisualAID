# VisualAID Backend API

Backend server for VisualAID - Visual Assistance App for Visually Impaired Users.

## Features

- ✅ Express.js REST API
- ✅ WebSocket support (Socket.io)
- ✅ PostgreSQL database connection (Supabase)
- ✅ CRUD operations for all database tables
- ✅ CORS configuration
- ✅ Error handling middleware
- ✅ Request logging

## Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL database (Supabase)

### Installation

1. Install dependencies:
```bash
cd backend
npm install
```

2. Create `.env` file in the root directory:
```bash
cp ../env.example .env
```

3. Update `.env` with your credentials:
- `DATABASE_URL` - Supabase PostgreSQL connection string
- `GEMINI_API_KEY` - Google Gemini API key
- `OPENAI_API_KEY` - OpenAI API key
- `FRONTEND_URL` - Frontend URL for CORS

### Running the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

Server will start on `http://localhost:3000`

## API Endpoints

### Health Check
- `GET /api/health` - Check server status

### Database Testing
- `GET /api/test-db/connection` - Test database connection
- `GET /api/test-db/crud` - Test all CRUD operations

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.js      # Database connection configuration
│   ├── models/
│   │   ├── user.js          # User CRUD operations
│   │   ├── emergencyContact.js
│   │   ├── sessionFrame.js
│   │   ├── dangerAlert.js
│   │   └── userNote.js
│   ├── routes/
│   │   ├── health.js        # Health check endpoint
│   │   └── test-db.js       # Database testing endpoints
│   └── server.js            # Main server file
├── package.json
└── README.md
```

## WebSocket Events

### Client → Server
- `frame:capture` - Send captured frame
- `voice:command` - Send voice command

### Server → Client
- `connection` - Client connected
- `disconnect` - Client disconnected

## Database Models

All models support basic CRUD operations:

- **userModel** - User management
- **emergencyContactModel** - Emergency contacts
- **sessionFrameModel** - Camera frames and analysis
- **dangerAlertModel** - Safety alerts
- **userNoteModel** - User notes and OCR data

## Environment Variables

See `env.example` for all required environment variables.

## Next Steps

See [ROADMAP.md](../ROADMAP.md) for development roadmap and next steps.

