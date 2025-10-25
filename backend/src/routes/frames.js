import express from 'express';
import { query } from '../config/database.js';

export const router = express.Router();

// Get all frames for a session
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const result = await query(
      `SELECT id, session_id, user_id, timestamp, frame_number, 
              frame_url, analysis, obstacles, detection_confidence
       FROM session_frames 
       WHERE session_id = $1 
       ORDER BY timestamp DESC`,
      [sessionId]
    );
    
    res.json({
      success: true,
      frames: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching session frames:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get single frame by ID
router.get('/:frameId', async (req, res) => {
  try {
    const { frameId } = req.params;
    
    const result = await query(
      `SELECT * FROM session_frames WHERE id = $1`,
      [frameId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Frame not found'
      });
    }
    
    res.json({
      success: true,
      frame: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching frame:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete old frames (cleanup utility)
router.delete('/cleanup/:daysOld', async (req, res) => {
  try {
    const { daysOld } = req.params;
    
    const result = await query(
      `DELETE FROM session_frames 
       WHERE timestamp < NOW() - INTERVAL '${parseInt(daysOld)} days'
       RETURNING id`,
    );
    
    res.json({
      success: true,
      deletedCount: result.rows.length,
      message: `Deleted ${result.rows.length} frames older than ${daysOld} days`
    });
  } catch (error) {
    console.error('Error cleaning up frames:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

