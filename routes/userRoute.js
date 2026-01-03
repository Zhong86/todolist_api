require('dotenv').config(); 
const express = require('express');
const router = express.Router(); 
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit'); 
const { authMiddleware } = require('../middleware/auth'); 

const ACCESS_TOKEN = '1d75ffdd91e81516eff0a932ed77c8f5';
const REFRESH_TOKEN = '1d75fffeia0981jf9asaa932ed77c8f5';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, //15 minutes
  max: 5, //5 req per 15 minutes
  message: 'Too many login attempts, please try again later.', 
  skipSuccessfulRequests: true, //Doesn't count successful login
}); 

//GET ONE
router.get('/users', authMiddleware, async (req, res) => {
  try {
    const users = await User.findById(req.user.userId).select('-password -refreshTokens'); 
    if (!user) {
      return res.status(404).json({ message: 'User not found' }); 
    }

    res.json(user); 
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//REGISTER
router.post('/register', authMiddleware, async (req, res) => {
  try {
    const existingUser = await User.findOne({ email: req.body.email }); 
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' }); 
    }

    const hashedPass = await bcrypt.hash(req.body.password, 10); 
    const user = new User({
      name: req.body.name,
      email: req.body.email, 
      password: hashedPass
    });

    const newUser = await user.save(); 

    const userData = { userId: newUser._id, email: newUser.email }; 
    const accessToken = jwt.sign(userData, ACCESS_TOKEN, { expiresIn: '15m' }); 
    const refreshToken = jwt.sign({ userId: newUser._id }, REFRESH_TOKEN, { expiresIn: '7d' }); 

    newUser.refreshTokens.push({ token: refreshToken }); 
    await newUser.save(); 

    res.status(201).json({
      accessToken, 
      refreshToken, 
      user: {
        id: newUser._id, 
        name: newUser.name, 
        email: newUser.email
      }
    }); 
  } catch (error) {
    res.status(500).json({message: error.message});
  }
});

//LOGIN
router.post('/login', authLimiter, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email }); 
    if(!user) return res.status(404).json({ message: 'User not found' });

    const correct = await bcrypt.compare(req.body.password, user.password); 

    if(!correct) {
      return res.status(401).json({ message: 'Invalid credentials' }); 
    }
    //generate token
    const userData = { userId: user._id, email: user.email };
    const accessToken = jwt.sign(userData, ACCESS_TOKEN, {expiresIn: '15m'});
    const refreshToken = jwt.sign({ userId: user._id }, REFRESH_TOKEN, { expiresIn: '7d' }); 

    user.refreshTokens.push({ token: refreshToken }); 

    if (user.refreshTokens.length > 5) {
      user.refreshTokens.shift(); 
    }
    await user.save(); 

    res.status(200).json({ 
      accessToken, 
      refreshToken, 
      user: {
        id: user._id, 
        name: user.name, 
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body; 
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' }); 
    }

    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN); 

    const user = await User.findOne({
      _id: decoded.userId, 
      'refreshTokens.token': refreshToken
    }); 

    if (!user) {
      return res.status(403).json({ message: 'Invalid refresh token' }); 
    }

    const userData = { userId: user._id, email: user.email }; 
    const newAccessToken = jwt.sign(userData, ACCESS_TOKEN, { expiresIn: '15m' }); 

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
    await User.findByIdAndUpdate(req.user.userId, {
      $pull: { refreshTokens: { token: refreshToken }}
    }); 

    res.json({ message: 'Logged out successfully' }); 
  } catch (error) {
    res.status(400).json({ error: error.message }); 
  }
}); 

router.post('/logout-all', authMiddleware, async (req, res) => {
  try {
    await user.findByIdAndUpdate(req.user.userId, {
      refreshTokens: []
    }); 

    res.json({ message: 'Logged out from all devices' }); 
  } catch (error) {
    res.status(400).json({ error: error.message }); 
  }
}); 

module.exports = router; 
