const express = require('express');
const mongoose = require('mongoose');
const port = process.env.PORT || 5000; 

//init mongoose
mongoose.connect(process.env.DATABASE_URL);
const db = mongoose.connection; 
db.once('open', () => console.log('Connected to the database'));
db.once('error', (err) => console.error(err));

const app = express(); 
app.use(express.json());


app.listen(port, () => {
    console.log('Server running on : ' + port);
})