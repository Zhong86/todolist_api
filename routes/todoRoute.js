const express = require('express'); 
const router = express.Router(); 
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
    const offset = (page - 1) * limit; 

    const [todos] = await pool.execute(
      'SELECT title, description FROM todo WHERE user_id = ? LIMIT ? OFFSET ?', 
      [req.user.userId, limit, offset]
    );
    
    //filter
    const { term } = req.query; 
    if(!term)
      return res.status(200).json(todos); 
    
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
    const [result] = await pool.execute(
      'INSERT INTO todo (title, description, user_id) VALUES (?,?,?)', 
      [req.body.title, req.body.description, req.user.userId]
    );

    if(result.affectedRows > 0)
      return res.status(201).json({ message: 'Todo created' });
    else return res.status(400).json({ error: 'Failed to create todo' }); 
  } catch (error) {
    res.status(500).json({ error: error.message }); 
  }
}); 

//UPDATE
router.put('/todos/:id', authMiddleware, todoLimiter,async (req, res) => {
  try {
    const [result] = await pool.execute(
      'UPDATE todo SET title = ?, description = ? WHERE id = ?', 
      [req.body.title, req.body.description, req.params.id]
    );

    if (result.affectedRows <= 0) {
      return res.status(404).json({ error: 'Todo not found' }); 
    }
    return res.status(200).json({ message: 'Updated todo' }); 
  } catch (error) {
    res.status(400).json({error: error.message }); 
  }
}); 

//DELETE
router.delete('/todos/:id', authMiddleware, todoLimiter,async (req, res) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM todo WHERE id = ?', 
      [req.params.id]
    );
    if (result.affectedRows <= 0) {
      return res.status(404).json({ error: 'Todo not found' }); 
    }

    res.status(200).json({ message: 'Todo deleted' }); 
  } catch (error) {
    res.status(500).json({ error: error.message }); 
  }
}); 

module.exports = router; 
