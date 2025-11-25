const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 5000;

// Middleware
app.use(cors()); // Allows your React app to talk to this server
app.use(express.json()); // Allows the server to understand JSON data

// MongoDB Connection
// We will create a database named 'course_management_db'
mongoose.connect('mongodb://127.0.0.1:27017/course_management_db')
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Basic Route to Test Server
app.get('/', (req, res) => {
  res.send('Server is Running!');
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});