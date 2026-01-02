const express = require('express'); 
const router = express.Router(); 
const mongoose = require('mongoose'); 
const Todo = require('../models/Todo'); 
const jwt = require('jsonwebtoken'); 
const tokenSecret = '1d75ffdd91e81516eff0a932ed77c8f5';

//GET TODOS
router.get('/todos', authMiddleware, async (req, res) => {
  try {
    //pagination to control data flow
    const page = parseInt(req.query.page) || 1; 
    const limit = parseInt(req.query.limit) || 10; 
    const skip = (page - 1) * limit; 

    const todos = await Todo.find({ userId: req.userId }); 
      .skip(skip).limit(limit).sort({ createdAt: -1 }); 

    //get total count for pagination info
    const total = await Todo.countDocuments({ userId: req.userId }); 

    res.json({ 
      data: todos, 
      page, 
      limit, 
      total
    }); 
  } catch (error) {
    res.status(500).json({ error: error.message }); 
  }
}); 

//CREATE TODO
router.post('/todos', authMiddleware, async (req, res) => {
  try {
    const todo = new Todo({
      title: req.body.title, 
      description: req.body.description, 
      userId: req.userId
    }); 

    await todo.save(); 
    res.status(201).json(todo); 
  } catch (error) {
    res.status(400).json({ error: error.message }); 
  }
}); 

//UPDATE
router.put('/todos/:id', authMiddleware, async (req, res) => {
  try {
    const todo = await Todo.findOneAndUpdate(
      {_id: req.params.id, userId: req.userId }, 
      req.body, 
      { new: true }
    ); 

    if (!todo) {
      return res.status(404).json({ error: 'Todo not fount' }); 
    }

    res.json(todo); 
  } catch (error) {
    res.status(400).json({error: error.message }); 
  }
}); 

//DELETE
router.delete('/todos/:id', authMiddleware, async (req, res) => {
  try {
    const todo = await Todo.findOneAndDelete({
      _id: req.params.id, 
      userId: req.userId
    }); 

    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' }); 
    }

    res.json({ message: 'Todo deleted' }); 
  } catch (error) {
    res.status(500).json({ error: error.message }); 
  }
}); 

function authMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1]; 

    if (!token) {
      return res.status(401).json({ error: 'No token provided' }); 
    }

    const decoded = jwt.verify(token, tokenSecret); 
    req.userId = decoded.userId; 
    next(); 
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' }); 
  }
}

module.exports = router; 
