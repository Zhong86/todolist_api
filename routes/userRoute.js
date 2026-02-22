require('dotenv').config(); 
const express = require('express');
const router = express.Router(); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit'); 
const { authMiddleware } = require('../middleware/auth'); 
const { pool } = require('../db');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, //15 minutes
  max: 5, //5 req per 15 minutes
  message: 'Too many login attempts, please try again later.', 
  skipSuccessfulRequests: true, //Doesn't count successful login
}); 

//GET ONE
router.get('/users', authMiddleware, async (req, res) => {
  try {
    const [result] = await pool.execute(
      'SELECT * FROM `users` WHERE email = ?', 
      req.user.userId
    );

    if (result.length <= 0) {
      return res.status(404).json({ message: 'User not found' }); 
    }

    res.json(result); 
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//REGISTER
router.post('/register', authLimiter, async (req, res) => {
  try {
    const [exist] = await pool.execute(
      'SELECT * FROM `users` WHERE `email` = ?',
      [req.body.email]
    );

    if (exist.fieldCount > 0) {
      return res.status(400).json({ message: 'Email already registered' }); 
    }

    const hashedPass = await bcrypt.hash(req.body.password, 10); 
    
    const [results] = await pool.execute(
      'INSERT INTO `users` (email, password) VALUES (?, ?)',
      [req.body.email, hashedPass]
    );

    if(results.affectedRows <= 0) return res.status(400).json({message: 'Unique email and a password needs to be given'});

    const userData = { id: results.insertId, email: req.body.email }; 
    const accessToken = jwt.sign(userData, process.env.ACCESS_TOKEN, { expiresIn: '15m' }); 
    const refreshToken = jwt.sign({ userId: results.insertId }, process.env.REFRESH_TOKEN, { expiresIn: '7d' }); 
      
    await pool.execute(
      'INSERT INTO refresh_tokens (user_id, token) VALUES (?,?)', 
      [results.insertId, refreshToken]
    );

    res.status(201).json({
      accessToken, 
      refreshToken, 
      user: {
        id: results.insertId, 
        email: req.body.email
      }
    }); 
  } catch (error) {
    res.status(500).json({message: error.message});
  }
});

//LOGIN
router.post('/login', authLimiter, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, email, password FROM `users` WHERE `email` = ?',
      [req.body.email]
    );
    const user = rows[0];
    if (user.length <= 0) {
      return res.status(404).json({ message: 'User not found' }); 
    }
    
    const correct = await bcrypt.compare(req.body.password, user.password); 
    if(!correct) {
      return res.status(401).json({ message: 'Invalid credentials' }); 
    }

    //generate token
    const userData = { userId: user.id, email: user.email };
    const accessToken = jwt.sign(userData, process.env.ACCESS_TOKEN, {expiresIn: '15m'});
    const refreshToken = jwt.sign({ userId: user.id }, process.env.REFRESH_TOKEN, { expiresIn: '7d' }); 
    
    await pool.execute(
      'INSERT INTO refresh_tokens (user_id, token) VALUES (?,?)', 
      [user.id, refreshToken]
    );

    res.status(200).json({ 
      accessToken, 
      refreshToken, 
      user: {
        id: user.id, 
        email: user.email
      }
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body; 
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' }); 
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN); 
    const [rows] = await pool.execute(
      'SELECT users.id, users.email FROM users ' + 
      'JOIN refresh_tokens AS rt ON rt.user_id = users.id ' + 
      'WHERE users.id = ? AND rt.token = ?', 
      [decoded.userId, refreshToken]
    );
    const user = rows[0];

    if (!user) {
      return res.status(403).json({ message: 'Invalid refresh token' }); 
    }

    const userData = { userId: user.id, email: user.email }; 
    const newAccessToken = jwt.sign(userData, process.env.ACCESS_TOKEN, { expiresIn: '15m' }); 

    res.json({ accessToken: newAccessToken }); 
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ message: 'Refresh token expired, please login again'}); 
    }
    res.status(403).json({ message: 'Invalid refresh token' }); 
  }
}); 

router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    await pool.execute(
      'DELETE FROM refresh_tokens WHERE user_id = ? AND token = ?', 
      [req.user.userId, refreshToken]
    );

    res.json({ message: 'Logged out successfully' }); 
  } catch (error) {
    res.status(400).json({ error: error.message }); 
  }
}); 

router.post('/logout-all', authMiddleware, async (req, res) => {
  try {
    await pool.execute(
      'DELETE FROM refresh_tokens WHERE user_id = ? ', 
      [req.user.userId]
    );
    res.json({ message: 'Logged out from all devices' }); 
  } catch (error) {
    res.status(400).json({ error: error.message }); 
  }
}); 

module.exports = router; 
