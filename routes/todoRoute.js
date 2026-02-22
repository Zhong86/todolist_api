const express = require('express'); 
const router = express.Router(); 
const jwt = require('jsonwebtoken'); 
const rateLimit = require('express-rate-limit'); 
const { authMiddleware } = require('../middleware/auth'); 
const { pool } = require('../db');

const todoLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,
  max: 50, 
  message: 'Too many todos, please try again later.'
}); 

//GET TODOS
router.get('/todos', authMiddleware, async (req, res) => {
  try {
    //pagination to control data flow
    const page = parseInt(req.query.page) || 1; 
    const limit = parseInt(req.query.limit) || 10; 
    const skip = (page - 1) * limit; 

    const todos = await Todo.find({ userId: req.user.userId })
      .skip(skip).limit(limit).sort({ createdAt: -1 }); 

    //get total count for pagination info
    const total = await Todo.countDocuments({ userId: req.user.userId }); 
    const todosData = {
      data: todos, 
      page, 
      limit, 
      total
    }; 
    
    //filter
    const { term } = req.query; 
    if(!term)
      return res.status(200).json(todosData); 
    
    const filteredTodos = todos.filter(todo => {
      const searchTerm = term.toLowerCase(); 
      return (
        todo.title?.toLowerCase().includes(searchTerm)
        || todo.description?.toLowerCase().includes(searchTerm)        
      ); 
    });

    res.status(200).json(filteredTodos); 
  } catch (error) {
    res.status(500).json({ error: error.message }); 
  }
}); 

//CREATE TODO
router.post('/todos', authMiddleware, todoLimiter, async (req, res) => {
  try {
    const todo = new Todo({
      title: req.body.title, 
      description: req.body.description, 
      userId: req.user.userId
    }); 

    await todo.save(); 
    res.status(201).json(todo); 
  } catch (error) {
    res.status(400).json({ error: error.message }); 
  }
}); 

//UPDATE
router.put('/todos/:id', authMiddleware, todoLimiter,async (req, res) => {
  try {
    const todo = await Todo.findOneAndUpdate(
      {_id: req.params.id, userId: req.user.userId }, 
      req.body, 
      { new: true }
    ); 

    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' }); 
    }

    res.json(todo); 
  } catch (error) {
    res.status(400).json({error: error.message }); 
  }
}); 

//DELETE
router.delete('/todos/:id', authMiddleware, todoLimiter,async (req, res) => {
  try {
    const todo = await Todo.findOneAndDelete({
      _id: req.params.id, 
      userId: req.user.userId
    }); 

    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' }); 
    }

    res.json({ message: 'Todo deleted' }); 
  } catch (error) {
    res.status(500).json({ error: error.message }); 
  }
}); 

module.exports = router; 
