const express = require('express');
const mongoose = require('mongoose');
const port = process.env.PORT || 5000; 
const api = '/api'; 

//init mongoose
mongoose.connect('mongodb://127.0.0.1:27017/todolist_api');
const db = mongoose.connection; 
db.once('open', () => console.log('Connected to the database'));
db.once('error', (err) => console.error(err));

const app = express(); 
app.use(express.json());

const userRoute = require('./routes/userRoute'); 
app.use(api, userRoute); 

app.listen(port, () => {
    console.log('Server running on : ' + port);
})
