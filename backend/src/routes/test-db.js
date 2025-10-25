import express from 'express';
import { testConnection } from '../config/database.js';
import { userModel } from '../models/user.js';
import { emergencyContactModel } from '../models/emergencyContact.js';
import { sessionFrameModel } from '../models/sessionFrame.js';
import { dangerAlertModel } from '../models/dangerAlert.js';
import { userNoteModel } from '../models/userNote.js';

export const router = express.Router();

// Test database connection
router.get('/connection', async (req, res) => {
  try {
    const isConnected = await testConnection();
    if (isConnected) {
      res.json({ status: 'success', message: 'Database connection successful' });
    } else {
      res.status(500).json({ status: 'error', message: 'Database connection failed' });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Test CRUD operations
router.get('/crud', async (req, res) => {
  try {
    // Test User CRUD
    const testUser = await userModel.create({
      name: 'Test User',
      email: `test_${Date.now()}@example.com`,
      password_hash: 'test_hash'
    });
    
    const foundUser = await userModel.findByEmail(testUser.email);
    
    // Test Emergency Contact CRUD
    const testContact = await emergencyContactModel.create({
      user_id: testUser.id,
      name: 'Sky Transport Solutions',
      phone: '3502178666',
      email: 'contact@skytransportsolutions.com',
      is_primary: true
    });
    
    // Test Session Frame CRUD
    const testFrame = await sessionFrameModel.create({
      user_id: testUser.id,
      session_id: '00000000-0000-0000-0000-000000000000',
      analysis: { objects: ['test'] },
      obstacles: [],
      frame_number: 1
    });
    
    // Test Danger Alert CRUD
    const testAlert = await dangerAlertModel.create({
      user_id: testUser.id,
      session_id: '00000000-0000-0000-0000-000000000000',
      alert_type: 'obstacle',
      severity: 'medium',
      alert_data: { description: 'Test obstacle detected' }
    });
    
    // Test User Note CRUD
    const testNote = await userNoteModel.create({
      user_id: testUser.id,
      note_text: 'Test note content',
      location_tag: 'Test location'
    });
    
    res.json({
      status: 'success',
      message: 'All CRUD operations successful',
      data: {
        user: foundUser,
        contact: testContact,
        frame: testFrame,
        alert: testAlert,
        note: testNote
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

