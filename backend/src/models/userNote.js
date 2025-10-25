import pool from '../config/database.js';

export const userNoteModel = {
  // Create user note
  async create(noteData) {
    const { user_id, note_text, location_tag = null, image_url = null, note_type = 'text' } = noteData;
    const query = `
      INSERT INTO user_notes (user_id, note_text, location_tag, image_url, note_type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(query, [user_id, note_text, location_tag, image_url, note_type]);
    return result.rows[0];
  },

  // Get notes by user ID
  async findByUserId(userId) {
    const query = 'SELECT * FROM user_notes WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [userId]);
    return result.rows;
  },

  // Search notes by content
  async search(userId, searchTerm) {
    const query = `
      SELECT * FROM user_notes 
      WHERE user_id = $1 
      AND (note_text ILIKE $2 OR location_tag ILIKE $2)
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [userId, `%${searchTerm}%`]);
    return result.rows;
  },

  // Update note
  async update(id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    const query = `
      UPDATE user_notes 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [id, ...values]);
    return result.rows[0];
  },

  // Delete note
  async delete(id) {
    const query = 'DELETE FROM user_notes WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
};

