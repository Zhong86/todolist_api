const express = require('express');
const router = express.Router(); 
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

//GET ALL
router.get('/users', async (req, res) => {
    try {
     const users = await User.find(); 
     res.json(users);    
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

//CREATE
router.post('/register', async (req, res) => {
    const hashedPass = await bcrypt.hash(req.body.password, 10); 
    const user = new User({
        name: req.body.name,
        email: req.body.email, 
        password: hashedPass
    });

    try {
        const newUser = await user.save();
        const newToken =  
        res.status(201).json(newUser);
    } catch (error) {
        
    }
});