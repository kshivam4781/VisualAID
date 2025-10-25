import express from 'express';
import { query } from '../config/database.js';

export const router = express.Router();

// Get all active sessions
router.get('/active', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, user_id, status, started_at, ended_at, frame_count, session_data
       FROM active_sessions 
       WHERE status = 'active' 
       ORDER BY started_at DESC`
    );
    
    res.json({
      success: true,
      sessions: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching active sessions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get specific session by ID
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const result = await query(
      `SELECT id, user_id, status, started_at, ended_at, frame_count, session_data
       FROM active_sessions 
       WHERE id = $1`,
      [sessionId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    res.json({
      success: true,
      session: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all sessions for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10, status } = req.query;
    
    let queryText = `
      SELECT id, user_id, status, started_at, ended_at, frame_count, session_data
      FROM active_sessions 
      WHERE user_id = $1
    `;
    
    const params = [userId];
    
    if (status) {
      queryText += ` AND status = $2`;
      params.push(status);
    }
    
    queryText += ` ORDER BY started_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));
    
    const result = await query(queryText, params);
    
    res.json({
      success: true,
      sessions: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get session statistics
router.get('/:sessionId/stats', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Get session info
    const sessionResult = await query(
      `SELECT * FROM active_sessions WHERE id = $1`,
      [sessionId]
    );
    
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    // Get frame count
    const frameResult = await query(
      `SELECT COUNT(*) as frame_count FROM session_frames WHERE session_id = $1`,
      [sessionId]
    );
    
    // Get danger alerts count
    const alertResult = await query(
      `SELECT COUNT(*) as alert_count FROM danger_alerts WHERE session_id = $1`,
      [sessionId]
    );
    
    const session = sessionResult.rows[0];
    const duration = session.ended_at 
      ? new Date(session.ended_at) - new Date(session.started_at)
      : Date.now() - new Date(session.started_at);
    
    res.json({
      success: true,
      stats: {
        sessionId: session.id,
        userId: session.user_id,
        status: session.status,
        startedAt: session.started_at,
        endedAt: session.ended_at,
        duration: Math.round(duration / 1000), // in seconds
        frameCount: parseInt(frameResult.rows[0].frame_count),
        alertCount: parseInt(alertResult.rows[0].alert_count),
        sessionData: session.session_data
      }
    });
  } catch (error) {
    console.error('Error fetching session stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete old sessions (cleanup utility)
router.delete('/cleanup/:daysOld', async (req, res) => {
  try {
    const { daysOld } = req.params;
    
    const result = await query(
      `DELETE FROM active_sessions 
       WHERE started_at < NOW() - INTERVAL '${parseInt(daysOld)} days'
       AND status != 'active'
       RETURNING id`,
    );
    
    res.json({
      success: true,
      deletedCount: result.rows.length,
      message: `Deleted ${result.rows.length} sessions older than ${daysOld} days`
    });
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

