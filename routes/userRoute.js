require('dotenv').config(); 
const express = require('express');
const router = express.Router(); 
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const tokenSecret = '1d75ffdd91e81516eff0a932ed77c8f5';

//GET ONE
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const users = await User.find(); 
    res.json(users.filter(user => user.email === req.user.email));    
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//REGISTER
router.post('/register', async (req, res) => {
  const hashedPass = await bcrypt.hash(req.body.password, 10); 
  const user = new User({
    name: req.body.name,
    email: req.body.email, 
    password: hashedPass
  });

  try {
    const newUser = await user.save();
    
    if(newUser == null) return res.status(400).json({ message: error.message }); 

    //return token from JWT
    const userData = { userId: newUser._id, email: newUser.email };
    const newToken = jwt.sign(userData, tokenSecret);

    res.status(201).json({ token: newToken });
  } catch (error) {
    res.status(500).json({message: error.message});
  }
});

//LOGIN
router.post('/login', async (req, res) => {
  try {
    const user = (await User.find({ email: req.body.email }))[0];
    if(user == null ) return res.status(404).json({ message: 'User not found' });

    const pass = req.body.password; 
    const correct = await bcrypt.compare(pass, user.password); 

    if(correct) {
      //generate token
      const userData = { userId: user._id, email: user.email };
      const token = jwt.sign(userData, tokenSecret);

      res.status(200).json({ token: token });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; 
  if (token == null) {
    res.status(401).json({ message: 'No token provided' });
  }

  jwt.verify(token, tokenSecret, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user; 
    next(); 
  });  
}

module.exports = router; 
