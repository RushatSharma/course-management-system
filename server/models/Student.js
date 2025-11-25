const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  joinDate: Date,
  totalFee: Number,
  paidAmount: Number,
  reminderMessage: String,
  // This links the student to a specific Course
  courseId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Course', 
    required: true 
  }
});

module.exports = mongoose.model('Student', studentSchema);