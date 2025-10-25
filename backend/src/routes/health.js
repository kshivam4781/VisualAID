import express from 'express';

export const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'VisualAID Backend API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});


