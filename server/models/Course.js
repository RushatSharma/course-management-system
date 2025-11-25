const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  whatYouLearn: String,
  startDate: Date,
  endDate: Date,
  language: { type: String, default: "English" }
});

module.exports = mongoose.model('Course', courseSchema);