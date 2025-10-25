import pool from '../config/database.js';

export const emergencyContactModel = {
  // Create emergency contact
  async create(contactData) {
    const { user_id, name, phone, email, is_primary } = contactData;
    const query = `
      INSERT INTO emergency_contacts (user_id, name, phone, email, is_primary)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(query, [user_id, name, phone, email, is_primary]);
    return result.rows[0];
  },

  // Get contacts by user ID
  async findByUserId(userId) {
    const query = 'SELECT * FROM emergency_contacts WHERE user_id = $1 ORDER BY is_primary DESC';
    const result = await pool.query(query, [userId]);
    return result.rows;
  },

  // Update contact
  async update(id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    const query = `
      UPDATE emergency_contacts 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [id, ...values]);
    return result.rows[0];
  },

  // Delete contact
  async delete(id) {
    const query = 'DELETE FROM emergency_contacts WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
};

