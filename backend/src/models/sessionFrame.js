import pool from '../config/database.js';

export const sessionFrameModel = {
  // Create session frame (schema: user_id, session_id, frame_url, analysis, obstacles, detection_confidence, frame_number)
  async create(frameData) {
    const {
      user_id,
      session_id,
      frame_url = null,
      analysis = {},
      obstacles = [],
      detection_confidence = null,
      frame_number
    } = frameData;

    const query = `
      INSERT INTO session_frames (user_id, session_id, frame_url, analysis, obstacles, detection_confidence, frame_number)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const result = await pool.query(query, [
      user_id,
      session_id,
      frame_url,
      analysis,
      obstacles,
      detection_confidence,
      frame_number
    ]);
    return result.rows[0];
  },

  // Get frames by session ID
  async findBySessionId(sessionId) {
    const query = 'SELECT * FROM session_frames WHERE session_id = $1 ORDER BY timestamp ASC';
    const result = await pool.query(query, [sessionId]);
    return result.rows;
  },

  // Get recent frames (last N frames)
  async getRecent(sessionId, limit = 5) {
    const query = `
      SELECT * FROM session_frames 
      WHERE session_id = $1 
      ORDER BY timestamp DESC 
      LIMIT $2
    `;
    const result = await pool.query(query, [sessionId, limit]);
    return result.rows;
  }
};

