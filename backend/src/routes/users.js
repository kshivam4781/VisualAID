import express from 'express';
import { userModel } from '../models/user.js';

export const router = express.Router();

// GET /api/users?limit=50&offset=0
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Number.parseInt(String(req.query.limit ?? '')) || 50, 200);
    const offset = Number.parseInt(String(req.query.offset ?? '')) || 0;
    const users = await userModel.list({ limit, offset });
    res.json({ status: 'success', data: users });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// GET /api/users/:id
router.get('/:id', async (req, res) => {
  try {
    const user = await userModel.findById(req.params.id);
    if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });
    res.json({ status: 'success', data: user });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// POST /api/users
router.post('/', async (req, res) => {
  try {
    const { name, email, password_hash } = req.body;
    if (!name || !email || !password_hash) {
      return res.status(400).json({ status: 'error', message: 'name, email, password_hash required' });
    }
    const user = await userModel.create({ name, email, password_hash });
    res.status(201).json({ status: 'success', data: user });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// PUT /api/users/:id
router.put('/:id', async (req, res) => {
  try {
    const updates = req.body || {};
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ status: 'error', message: 'No fields to update' });
    }
    const user = await userModel.update(req.params.id, updates);
    if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });
    res.json({ status: 'success', data: user });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await userModel.delete(req.params.id);
    if (!deleted) return res.status(404).json({ status: 'error', message: 'User not found' });
    res.json({ status: 'success', data: deleted });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});


