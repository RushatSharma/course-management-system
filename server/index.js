const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Import Models
const Course = require('./models/Course');
const Student = require('./models/Student');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect('mongodb://127.0.0.1:27017/course_management_db')
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ================= API ROUTES =================

// 1. GET ALL COURSES (with their Students)
app.get('/api/courses', async (req, res) => {
  try {
    const courses = await Course.find();
    
    // Fetch students for each course
    const coursesWithStudents = await Promise.all(courses.map(async (course) => {
      const students = await Student.find({ courseId: course._id });
      return { ...course.toObject(), students };
    }));

    res.json(coursesWithStudents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. CREATE A NEW COURSE
app.post('/api/courses', async (req, res) => {
  try {
    const newCourse = new Course(req.body);
    const savedCourse = await newCourse.save();
    res.status(201).json({ ...savedCourse.toObject(), students: [] });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 3. UPDATE A COURSE
app.put('/api/courses/:id', async (req, res) => {
  try {
    const updatedCourse = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedCourse);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 4. DELETE A COURSE
app.delete('/api/courses/:id', async (req, res) => {
  try {
    const courseId = req.params.id;
    await Student.deleteMany({ courseId: courseId }); // Delete students first
    await Course.findByIdAndDelete(courseId);
    res.json({ message: 'Course and related students deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 5. ADD A STUDENT
app.post('/api/students', async (req, res) => {
  try {
    const newStudent = new Student(req.body);
    const savedStudent = await newStudent.save();
    res.status(201).json(savedStudent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 6. UPDATE A STUDENT
app.put('/api/students/:id', async (req, res) => {
  try {
    const updatedStudent = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedStudent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 7. DELETE A STUDENT
app.delete('/api/students/:id', async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.json({ message: 'Student deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});