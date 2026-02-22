const express = require('express');
const port = 5000; 
const api = '/api'; 

const app = express(); 
app.use(express.json());

const userRoute = require('./routes/userRoute'); 
app.use(api, userRoute); 

const todoRoute = require('./routes/todoRoute'); 
app.use(api, todoRoute); 

app.listen(port, () => {
    console.log('Server running on : ' + port);
})
