import pool from '../config/database.js';

export const dangerAlertModel = {
  // Create danger alert
  async create(alertData) {
    const { user_id, session_id = null, alert_type, severity, alert_data = {}, frame_url = null, sent_to = null } = alertData;
    const query = `
      INSERT INTO danger_alerts (user_id, session_id, alert_type, severity, alert_data, frame_url, sent_to)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const result = await pool.query(query, [user_id, session_id, alert_type, severity, alert_data, frame_url, sent_to]);
    return result.rows[0];
  },

  // Get alerts by user ID
  async findByUserId(userId) {
    const query = 'SELECT * FROM danger_alerts WHERE user_id = $1 ORDER BY timestamp DESC';
    const result = await pool.query(query, [userId]);
    return result.rows;
  },

  // Get recent alerts
  async getRecent(userId, limit = 10) {
    const query = `
      SELECT * FROM danger_alerts 
      WHERE user_id = $1 
      ORDER BY timestamp DESC 
      LIMIT $2
    `;
    const result = await pool.query(query, [userId, limit]);
    return result.rows;
  }
};

