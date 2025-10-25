-- VisualAID PostgreSQL Schema with Indexing and Optimization
-- Designed for Railway PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for users table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- EMERGENCY CONTACTS TABLE
-- ============================================
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

-- Indexes for emergency_contacts table
CREATE INDEX idx_emergency_contacts_user_id ON emergency_contacts(user_id);
CREATE INDEX idx_emergency_contacts_primary ON emergency_contacts(user_id, is_primary) WHERE is_primary = TRUE;

CREATE TRIGGER update_emergency_contacts_updated_at BEFORE UPDATE ON emergency_contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SESSION FRAMES TABLE
-- ============================================
CREATE TABLE session_frames (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    frame_url TEXT, -- Changed from VARCHAR(500) to TEXT to store base64 images
    analysis JSONB, -- JSONB for better performance and indexing
    obstacles JSONB,
    detection_confidence DECIMAL(5,2),
    frame_number INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for session_frames table
CREATE INDEX idx_session_frames_user_id ON session_frames(user_id);
CREATE INDEX idx_session_frames_session_id ON session_frames(session_id);
CREATE INDEX idx_session_frames_timestamp ON session_frames(timestamp DESC);
CREATE INDEX idx_session_frames_user_session ON session_frames(user_id, session_id, timestamp DESC);
CREATE INDEX idx_session_frames_obstacles ON session_frames USING GIN (obstacles); -- GIN index for JSONB

-- ============================================
-- DANGER ALERTS TABLE
-- ============================================
CREATE TABLE danger_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID,
    frame_url VARCHAR(500),
    alert_type VARCHAR(50), -- 'obstacle', 'fall_risk', 'emergency', etc.
    severity VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
    alert_data JSONB,
    sent_to VARCHAR(255),
    is_resolved BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for danger_alerts table
CREATE INDEX idx_danger_alerts_user_id ON danger_alerts(user_id);
CREATE INDEX idx_danger_alerts_timestamp ON danger_alerts(timestamp DESC);
CREATE INDEX idx_danger_alerts_unresolved ON danger_alerts(user_id, is_resolved) WHERE is_resolved = FALSE;
CREATE INDEX idx_danger_alerts_severity ON danger_alerts(severity);

-- ============================================
-- USER NOTES TABLE
-- ============================================
CREATE TABLE user_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    location_tag VARCHAR(255),
    image_url VARCHAR(500),
    note_type VARCHAR(50), -- 'text', 'location', 'reminder', etc.
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for user_notes table
CREATE INDEX idx_user_notes_user_id ON user_notes(user_id);
CREATE INDEX idx_user_notes_location ON user_notes(location_tag);
CREATE INDEX idx_user_notes_created_at ON user_notes(created_at DESC);
CREATE INDEX idx_user_notes_active ON user_notes(user_id, is_archived) WHERE is_archived = FALSE;
CREATE INDEX idx_user_notes_fulltext ON user_notes USING GIN (to_tsvector('english', note_text)); -- Full-text search

CREATE TRIGGER update_user_notes_updated_at BEFORE UPDATE ON user_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ACTIVE SESSIONS TABLE (for tracking active vision sessions)
-- ============================================
CREATE TABLE active_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'paused', 'stopped'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    frame_count INTEGER DEFAULT 0,
    session_data JSONB
);

-- Indexes for active_sessions table
CREATE INDEX idx_active_sessions_user_id ON active_sessions(user_id);
CREATE INDEX idx_active_sessions_status ON active_sessions(status);
CREATE INDEX idx_active_sessions_active ON active_sessions(user_id, status) WHERE status = 'active';

-- ============================================
-- PERFORMANCE OPTIMIZATIONS
-- ============================================

-- Partition session_frames by date (optional for large scale)
-- This would partition by timestamp ranges if needed
-- CREATE TABLE session_frames_2024 PARTITION OF session_frames
--     FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Analyze tables for query optimizer
ANALYZE users;
ANALYZE emergency_contacts;
ANALYZE session_frames;
ANALYZE danger_alerts;
ANALYZE user_notes;
ANALYZE active_sessions;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get recent frames for a user
CREATE OR REPLACE FUNCTION get_recent_frames(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    session_id UUID,
    analysis JSONB,
    obstacles JSONB,
    "timestamp" TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sf.id,
        sf.session_id,
        sf.analysis,
        sf.obstacles,
        sf.timestamp
    FROM session_frames sf
    WHERE sf.user_id = p_user_id
    ORDER BY sf.timestamp DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get active sessions count
CREATE OR REPLACE FUNCTION get_active_sessions_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM active_sessions
    WHERE user_id = p_user_id AND status = 'active';
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEWS FOR EASIER QUERIES
-- ============================================

-- View for user dashboard summary
CREATE OR REPLACE VIEW user_dashboard AS
SELECT 
    u.id AS user_id,
    u.name,
    u.email,
    u.created_at,
    COUNT(DISTINCT ec.id) AS emergency_contacts_count,
    COUNT(DISTINCT sf.id) AS total_frames,
    COUNT(DISTINCT da.id) AS total_alerts,
    COUNT(DISTINCT un.id) AS total_notes,
    MAX(sf.timestamp) AS last_frame_time
FROM users u
LEFT JOIN emergency_contacts ec ON u.id = ec.user_id
LEFT JOIN session_frames sf ON u.id = sf.user_id
LEFT JOIN danger_alerts da ON u.id = da.user_id
LEFT JOIN user_notes un ON u.id = un.user_id
WHERE u.is_active = TRUE
GROUP BY u.id, u.name, u.email, u.created_at;

-- View for recent alerts
CREATE OR REPLACE VIEW recent_alerts AS
SELECT 
    da.id,
    da.user_id,
    u.name AS user_name,
    da.alert_type,
    da.severity,
    da.timestamp,
    da.is_resolved
FROM danger_alerts da
JOIN users u ON da.user_id = u.id
WHERE da.is_resolved = FALSE
ORDER BY da.timestamp DESC;

-- ============================================
-- INITIAL DATA
-- ============================================

-- Insert default emergency contact data (for reference)
-- This would be Sky Transport Solutions info
-- Note: We'll insert this per user during registration

COMMENT ON TABLE users IS 'Stores user account information';
COMMENT ON TABLE emergency_contacts IS 'Emergency contacts for each user';
COMMENT ON TABLE session_frames IS 'Captured frames with AI analysis during vision sessions';
COMMENT ON TABLE danger_alerts IS 'Safety alerts and danger detections';
COMMENT ON TABLE user_notes IS 'User notes and reminders captured via camera';
COMMENT ON TABLE active_sessions IS 'Currently active vision sessions';

COMMENT ON COLUMN session_frames.analysis IS 'JSONB containing AI analysis of the frame';
COMMENT ON COLUMN session_frames.obstacles IS 'JSONB containing detected obstacles information';
COMMENT ON COLUMN danger_alerts.severity IS 'Alert severity: low, medium, high, critical';

