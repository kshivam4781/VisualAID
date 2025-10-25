# Database Configuration - Supabase

## Current Setup

**Database Provider:** Supabase PostgreSQL  
**Project Reference:** `aaepdorqqabhscowpidz`  
**Region:** US East 2 (Ohio)  
**Password:** `Transport@IT@121`

## Connection Strings

### Production Connection (Pooler Mode - Use for Deployment)
```env
DATABASE_URL=postgresql://postgres.aaepdorqqabhscowpidz:Transport%40IT%40121@aws-1-us-east-2.pooler.supabase.com:6543/postgres
```

**Details:**
- **Host:** `aws-1-us-east-2.pooler.supabase.com`
- **Port:** `6543`
- **Database:** `postgres`
- **User:** `postgres.aaepdorqqabhscowpidz`
- **Pool Mode:** Transaction
- **IPv4 Compatible:** ✅ Yes

### Development Connection (Direct Mode - IPv6 Only)
```env
DATABASE_URL=postgresql://postgres:Transport@IT@121@db.aaepdorqqabhscowpidz.supabase.co:5432/postgres
```

**Details:**
- **Host:** `db.aaepdorqqabhscowpidz.supabase.co`
- **Port:** `5432`
- **Database:** `postgres`
- **User:** `postgres`
- **IPv4 Compatible:** ❌ No (IPv6 only)

## Environment Variables

Create a `.env` file in your backend directory with:

```env
# Supabase Database (Pooler Mode)
DATABASE_URL=postgresql://postgres.aaepdorqqabhscowpidz:Transport%40IT%40121@aws-1-us-east-2.pooler.supabase.com:6543/postgres

# AI API Keys
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key

# Application
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
```

## Important Notes

### Password URL Encoding
Special characters in passwords must be URL-encoded:
- `@` → `%40`
- `#` → `%23`
- `%` → `%25`
- etc.

### Connection Pooling
- **Use Pooler for:** Railway, Vercel, Render, production deployments
- **Direct connection:** Local development only (requires IPv6)

### Database Schema
- Schema file: `database/schema.sql`
- Tables: users, emergency_contacts, session_frames, danger_alerts, user_notes, active_sessions
- Status: ✅ Initialized in Supabase

## Testing Connection

### Using Node.js (pg library)
```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected:', res.rows[0]);
  }
});
```

### Using Supabase Dashboard
1. Go to Supabase Dashboard
2. Click "SQL Editor" in left sidebar
3. Run test query: `SELECT NOW();`

## Accessing Supabase Dashboard

**Dashboard URL:** https://supabase.com/dashboard/project/aaepdorqqabhscowpidz

**Features:**
- SQL Editor for running queries
- Table Editor for viewing data
- Connection strings and settings
- API documentation
- Logs and monitoring

## Backup Connection Info

If you need to reset or recreate:
- Project Reference: `aaepdorqqabhscowpidz`
- Region: `us-east-2`
- Database name: `postgres`
- Username (Pooler): `postgres.aaepdorqqabhscowpidz`
- Password: `Transport@IT@121`

## Troubleshooting

### Connection Refused
- Check Supabase project is active (not paused)
- Verify connection string is correct
- Use Pooler connection for production

### SSL Error
- Add `ssl: { rejectUnauthorized: false }` to connection config
- Required for Supabase connections

### Password Authentication Failed
- Verify password is correct
- Check URL encoding of special characters
- Use Pooler connection if Direct fails

