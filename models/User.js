const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String, 
        required: true
    },
    email: {
        type: String, 
        required: true, 
        unique: true
    }, 
    password: {
        type: String, 
        required: true
    }, 
  refreshTokens: [{
    token: String, 
    createdAt: { type: Date, default: Date.now, expires: 604800 } //7 days
  }]
});

module.exports = mongoose.model('User', userSchema); 
