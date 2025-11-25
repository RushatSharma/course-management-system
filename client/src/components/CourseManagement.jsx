import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { format, differenceInDays } from "date-fns";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserPlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  UsersIcon,
  CurrencyDollarIcon,
  AcademicCapIcon,
  BellIcon,
  UserIcon,
  XMarkIcon,
  LightBulbIcon,
} from "@heroicons/react/24/outline";

const API_URL = "http://localhost:5000/api";

const CourseManagement = () => {
  /* ==================== STATE ==================== */
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  
  // Refs to track state inside async functions without triggering re-renders
  const selectedCourseRef = useRef(null);

  // Modals
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showStudentDetailModal, setShowStudentDetailModal] = useState(false);
  
  // Selections & Editing
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);

  // Loading state
  const [loading, setLoading] = useState(true);

  // Sync Ref with State
  useEffect(() => {
    selectedCourseRef.current = selectedCourse;
  }, [selectedCourse]);

  /* ==================== API FETCHING ==================== */
  // Wrapped in useCallback to satisfy linter and prevent loops
  const fetchCourses = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/courses`);
      setCourses(res.data);
      
      // Use ref to check current selection to avoid stale closures or dependency loops
      const currentSelected = selectedCourseRef.current;

      if (currentSelected) {
        const updatedSelected = res.data.find(c => c._id === currentSelected._id);
        setSelectedCourse(updatedSelected || res.data[0] || null);
      } else if (res.data.length > 0) {
        setSelectedCourse(res.data[0]);
      }
      setLoading(false);
    } catch (err) {
      console.error("Error fetching courses:", err);
      setLoading(false);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  /* ==================== ANALYTICS ==================== */
  const totalStudents = courses.reduce((sum, c) => sum + (c.students?.length || 0), 0);
  const totalCourses = courses.length;

  const totalPendingFees = courses.reduce(
    (sum, c) =>
      sum +
      (c.students?.reduce(
        (sSum, s) => sSum + (s.paidAmount < s.totalFee ? s.totalFee - s.paidAmount : 0),
        0
      ) || 0),
    0
  );

  const reminders = courses.reduce(
    (sum, c) => sum + (c.students?.filter((s) => s.paidAmount < s.totalFee).length || 0),
    0
  );

  /* ==================== HELPERS ==================== */
  const formatCurrency = (amount) => `₹${amount?.toLocaleString() || 0}`;
  
  const calculateDuration = (start, end) => {
    if (!start || !end) return "N/A";
    const days = differenceInDays(new Date(end), new Date(start));
    return `${days} days`;
  };

  const getFeeStatusBadge = (student) => {
    const isPaid = student.paidAmount >= student.totalFee;
    return isPaid ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircleIcon className="w-4 h-4 mr-1" />
        Paid
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <XCircleIcon className="w-4 h-4 mr-1" />
        Pending
      </span>
    );
  };

  const openStudentDetail = (student) => {
    setSelectedStudent(student);
    setShowStudentDetailModal(true);
  };

  const sendWhatsAppReminder = (student) => {
    const pending = student.totalFee - student.paidAmount;
    const message = student.reminderMessage || 
      `Dear ${student.name},\n\nYour pending fee is *${formatCurrency(pending)}*.\nPlease pay soon to continue your course.\n\nThank you!`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappURL = `https://wa.me/${student.phone}?text=${encodedMessage}`;
    window.open(whatsappURL, "_blank");
  };

  /* ==================== COURSE CRUD ==================== */
  const handleSaveCourse = async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = {
      title: form.courseTitle.value,
      description: form.description.value,
      whatYouLearn: form.whatYouLearn.value,
      language: "English",
      startDate: form.startDate.value,
      endDate: form.endDate.value,
    };

    try {
      if (editingCourse) {
        await axios.put(`${API_URL}/courses/${editingCourse._id}`, data);
      } else {
        await axios.post(`${API_URL}/courses`, data);
      }
      fetchCourses();
      setShowCourseModal(false);
      setEditingCourse(null);
    } catch (err) {
      alert("Error saving course: " + err.message);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (window.confirm("Delete this course and all its students?")) {
      try {
        await axios.delete(`${API_URL}/courses/${courseId}`);
        setSelectedCourse(null); // Reset selection before fetching
        fetchCourses();
      } catch (err) {
        alert("Error deleting course: " + err.message);
      }
    }
  };

  /* ==================== STUDENT CRUD ==================== */
  const handleSaveStudent = async (e) => {
    e.preventDefault();
    const form = e.target;
    const totalFee = parseInt(form.totalFee.value) || 18000;
    const paidAmount = parseInt(form.paidAmount?.value) || 0;

    const data = {
      name: form.studentName.value,
      email: form.email.value,
      phone: form.phone.value.startsWith("+") ? form.phone.value : `+91${form.phone.value}`,
      joinDate: form.joinDate.value,
      totalFee,
      paidAmount,
      reminderMessage: editingStudent?.reminderMessage || "",
      courseId: selectedCourse._id 
    };

    try {
      if (editingStudent) {
        await axios.put(`${API_URL}/students/${editingStudent._id}`, data);
      } else {
        await axios.post(`${API_URL}/students`, data);
      }
      fetchCourses();
      setShowStudentModal(false);
      setEditingStudent(null);
    } catch (err) {
      alert("Error saving student: " + err.message);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (window.confirm("Remove this student from the course?")) {
      try {
        await axios.delete(`${API_URL}/students/${studentId}`);
        fetchCourses();
      } catch (err) {
        alert("Error deleting student: " + err.message);
      }
    }
  };

  const updateStudentReminder = async (message) => {
    try {
      // Optimistically update UI
      setSelectedStudent(prev => ({ ...prev, reminderMessage: message }));
      // Save to DB
      await axios.put(`${API_URL}/students/${selectedStudent._id}`, {
        ...selectedStudent,
        reminderMessage: message
      });
      fetchCourses();
    } catch (err) {
      console.error("Error updating reminder", err);
    }
  };

  /* ==================== RENDER ==================== */
  if (loading) return <div className="p-10 text-center text-gray-500">Loading Dashboard...</div>;

  if (!selectedCourse && courses.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-xl text-gray-500 mb-4">No courses available</p>
          <button
            onClick={() => { setEditingCourse(null); setShowCourseModal(true); }}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 flex items-center mx-auto"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Create First Course
          </button>
          
          {/* Re-use Modal Logic for First Course */}
          {showCourseModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
                <h3 className="text-xl font-bold mb-6">Create New Course</h3>
                <form onSubmit={handleSaveCourse} className="space-y-5">
                  <input type="text" name="courseTitle" placeholder="Course Title" required className="w-full px-3 py-2 border rounded-md" />
                  <textarea name="description" placeholder="Description" required rows="2" className="w-full px-3 py-2 border rounded-md"></textarea>
                  <textarea name="whatYouLearn" placeholder="What You'll Learn" required rows="3" className="w-full px-3 py-2 border rounded-md"></textarea>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="date" name="startDate" required className="w-full px-3 py-2 border rounded-md" />
                    <input type="date" name="endDate" required className="w-full px-3 py-2 border rounded-md" />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setShowCourseModal(false)} className="px-5 py-2 border rounded text-gray-700">Cancel</button>
                    <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded">Create</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback if courses exist but selection is null (rare case due to fetch logic)
  if (!selectedCourse && courses.length > 0) return null; 

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* TOP DASHBOARD */}
        <div className="mb-8">
          <div className="text-center mb-4">
            <h2 className="text-lg font-semibold text-gray-700">Fees, Attendance & Reminders</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between border-l-4 border-blue-500">
              <div>
                <p className="text-3xl font-bold text-blue-600">{totalStudents}</p>
                <p className="text-sm text-gray-600 mt-1">Students</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full"><UsersIcon className="w-6 h-6 text-blue-600" /></div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between border-l-4 border-green-500">
              <div>
                <p className="text-3xl font-bold text-green-600">{totalCourses}</p>
                <p className="text-sm text-gray-600 mt-1">Courses</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full"><AcademicCapIcon className="w-6 h-6 text-green-600" /></div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between border-l-4 border-purple-500">
              <div>
                <p className="text-3xl font-bold text-purple-600">{formatCurrency(totalPendingFees)}</p>
                <p className="text-sm text-gray-600 mt-1">Pending Fees</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full"><CurrencyDollarIcon className="w-6 h-6 text-purple-600" /></div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between border-l-4 border-orange-500">
              <div>
                <p className="text-3xl font-bold text-orange-600">{reminders}</p>
                <p className="text-sm text-gray-600 mt-1">Reminders</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full"><BellIcon className="w-6 h-6 text-orange-600" /></div>
            </div>
          </div>
        </div>

        {/* COURSE MANAGEMENT */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Course Management</h1>
          <button
            onClick={() => { setEditingCourse(null); setShowCourseModal(true); }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            New Course
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Course Selector */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center">
                <CalendarIcon className="w-5 h-5 mr-2 text-indigo-600" />
                Courses
              </h3>
              <div className="space-y-2">
                {courses.map((course) => (
                  <div
                    key={course._id}
                    onClick={() => setSelectedCourse(course)}
                    className={`p-3 rounded cursor-pointer transition-colors ${
                      selectedCourse && selectedCourse._id === course._id ? "bg-indigo-50 border-l-4 border-indigo-600" : "hover:bg-gray-50"
                    }`}
                  >
                    <p className="font-medium text-sm">{course.title}</p>
                    <p className="text-xs text-gray-500">
                      {course.startDate && format(new Date(course.startDate), "MMM d")} - {course.endDate && format(new Date(course.endDate), "MMM d, yyyy")}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">{course.students?.length || 0} students</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Course Details */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{selectedCourse.title}</h2>
                  <p className="text-sm text-gray-600 mt-1">{selectedCourse.description}</p>
                  <div className="flex items-center gap-6 mt-3 text-sm text-gray-600">
                    <div className="flex items-center">
                      <CalendarIcon className="w-5 h-5 mr-1 text-indigo-600" />
                      <span><strong>Start:</strong> {selectedCourse.startDate ? format(new Date(selectedCourse.startDate), "dd MMM yyyy") : "N/A"}</span>
                    </div>
                    <div className="flex items-center">
                      <CalendarIcon className="w-5 h-5 mr-1 text-red-600" />
                      <span><strong>End:</strong> {selectedCourse.endDate ? format(new Date(selectedCourse.endDate), "dd MMM yyyy") : "N/A"}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingCourse(selectedCourse); setShowCourseModal(true); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded">
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleDeleteCourse(selectedCourse._id)} className="p-2 text-red-600 hover:bg-red-50 rounded">
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
                <h4 className="font-semibold text-gray-700 mb-2 flex items-center">
                  <LightBulbIcon className="w-5 h-5 mr-2 text-yellow-600" />
                  What You'll Learn
                </h4>
                <p className="text-sm text-gray-600">{selectedCourse.whatYouLearn}</p>
              </div>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-semibold text-gray-700 flex items-center">
                  <UsersIcon className="w-5 h-5 mr-2 text-indigo-600" />
                  Enrolled Students ({selectedCourse.students?.length || 0})
                </h3>
                <button
                  onClick={() => { setEditingStudent(null); setShowStudentModal(true); }}
                  className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700 flex items-center"
                >
                  <UserPlusIcon className="w-4 h-4 mr-1" />
                  Add Student
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Fee</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pending</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(!selectedCourse.students || selectedCourse.students.length === 0) ? (
                      <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-500">No students enrolled yet.</td></tr>
                    ) : (
                      selectedCourse.students.map((student) => {
                        const pending = student.totalFee - student.paidAmount;
                        return (
                          <tr key={student._id}>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <button onClick={() => openStudentDetail(student)} className="text-sm font-medium text-indigo-600 hover:text-indigo-900 hover:underline">
                                {student.name}
                              </button>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{student.email}</div>
                              <div className="text-xs text-gray-400">{student.phone}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">{formatCurrency(student.totalFee)}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600">{formatCurrency(student.paidAmount)}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-red-600">{formatCurrency(pending)}</td>
                            <td className="px-4 py-3 whitespace-nowrap">{getFeeStatusBadge(student)}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                              {student.paidAmount < student.totalFee && (
                                <button onClick={() => sendWhatsAppReminder(student)} className="text-green-600 hover:text-green-800 mr-2" title="WhatsApp Reminder">
                                   <svg className="w-4 h-4 inline" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.297-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.263c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/></svg>
                                </button>
                              )}
                              <button onClick={() => { setEditingStudent(student); setShowStudentModal(true); }} className="text-indigo-600 hover:text-indigo-900 mr-3">
                                <PencilIcon className="w-4 h-4 inline" />
                              </button>
                              <button onClick={() => handleDeleteStudent(student._id)} className="text-red-600 hover:text-red-900">
                                <TrashIcon className="w-4 h-4 inline" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STUDENT DETAIL MODAL */}
      {showStudentDetailModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-t-lg flex justify-between items-center">
              <div className="flex items-center">
                <div className="bg-white text-blue-600 w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl mr-3">
                  {selectedStudent.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedStudent.name}</h3>
                  <p className="text-sm opacity-90">Student Details</p>
                </div>
              </div>
              <button onClick={() => setShowStudentDetailModal(false)} className="text-white hover:bg-white hover:bg-opacity-20 p-1 rounded">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-700 mb-3 flex items-center"><UserIcon className="w-5 h-5 mr-2 text-indigo-600" /> Personal Information</h4>
                  <table className="w-full text-sm">
                    <tbody>
                      <tr><td className="py-1 font-medium">Full Name</td><td className="py-1">{selectedStudent.name}</td></tr>
                      <tr><td className="py-1 font-medium">Email</td><td className="py-1">{selectedStudent.email}</td></tr>
                      <tr><td className="py-1 font-medium">Phone</td><td className="py-1">{selectedStudent.phone}</td></tr>
                      <tr><td className="py-1 font-medium">Enrolled</td><td className="py-1">{selectedStudent.joinDate ? format(new Date(selectedStudent.joinDate), "dd MMM yyyy") : "N/A"}</td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-700 mb-3 flex items-center"><AcademicCapIcon className="w-5 h-5 mr-2 text-green-600" /> Course Details</h4>
                  <table className="w-full text-sm">
                    <tbody>
                      <tr><td className="py-1 font-medium">Course</td><td className="py-1">{selectedCourse.title}</td></tr>
                      <tr><td className="py-1 font-medium">Duration</td><td className="py-1">{calculateDuration(selectedCourse.startDate, selectedCourse.endDate)}</td></tr>
                      <tr><td className="py-1 font-medium">Total Fee</td><td className="py-1 text-green-600 font-semibold">{formatCurrency(selectedStudent.totalFee)}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-5">
                <h4 className="font-semibold text-gray-700 mb-4 flex items-center"><CurrencyDollarIcon className="w-5 h-5 mr-2 text-blue-600" /> Financial Overview</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div><p className="text-2xl font-bold text-gray-800">{formatCurrency(selectedStudent.totalFee)}</p><p className="text-xs text-gray-600">Total Fee</p></div>
                  <div><p className="text-2xl font-bold text-blue-600">{formatCurrency(selectedStudent.paidAmount)}</p><p className="text-xs text-gray-600">Paid</p></div>
                  <div><p className="text-2xl font-bold text-red-600">{formatCurrency(selectedStudent.totalFee - selectedStudent.paidAmount)}</p><p className="text-xs text-gray-600">Pending</p></div>
                </div>
              </div>
              {selectedStudent.paidAmount < selectedStudent.totalFee && (
                <div className="bg-orange-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-700 mb-2 flex items-center"><BellIcon className="w-5 h-5 mr-2 text-orange-600" /> Custom Reminder Message</h4>
                  <textarea value={selectedStudent.reminderMessage || ""} onChange={(e) => updateStudentReminder(e.target.value)} placeholder="Enter custom reminder..." className="w-full p-3 border border-orange-200 rounded-md text-sm focus:ring-2 focus:ring-orange-500" rows="3" />
                </div>
              )}
              <div className="flex justify-center gap-3 pt-4">
                {selectedStudent.paidAmount < selectedStudent.totalFee && (
                  <button onClick={() => sendWhatsAppReminder(selectedStudent)} className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 flex items-center">
                    Send WhatsApp
                  </button>
                )}
                <button onClick={() => setShowStudentDetailModal(false)} className="bg-gray-600 text-white px-5 py-2 rounded-lg hover:bg-gray-700">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE/EDIT COURSE MODAL */}
      {showCourseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto p-6">
            <h3 className="text-xl font-bold mb-6">{editingCourse ? "Edit Course" : "Create New Course"}</h3>
            <form onSubmit={handleSaveCourse} className="space-y-5">
              <input type="text" name="courseTitle" defaultValue={editingCourse?.title} placeholder="Course Title" required className="w-full px-3 py-2 border rounded-md" />
              <textarea name="description" defaultValue={editingCourse?.description} placeholder="Description" required rows="2" className="w-full px-3 py-2 border rounded-md"></textarea>
              <textarea name="whatYouLearn" defaultValue={editingCourse?.whatYouLearn} placeholder="What You'll Learn" required rows="3" className="w-full px-3 py-2 border rounded-md"></textarea>
              <div className="grid grid-cols-2 gap-4">
                <input type="date" name="startDate" defaultValue={editingCourse?.startDate ? new Date(editingCourse.startDate).toISOString().split('T')[0] : ''} required className="w-full px-3 py-2 border rounded-md" />
                <input type="date" name="endDate" defaultValue={editingCourse?.endDate ? new Date(editingCourse.endDate).toISOString().split('T')[0] : ''} required className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => { setShowCourseModal(false); setEditingCourse(null); }} className="px-5 py-2 border rounded text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">{editingCourse ? "Update" : "Create"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD/EDIT STUDENT MODAL */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h3 className="text-xl font-bold mb-6">{editingStudent ? "Edit Student" : "Add New Student"}</h3>
            <form onSubmit={handleSaveStudent} className="space-y-4">
              <input type="text" name="studentName" defaultValue={editingStudent?.name} placeholder="Full Name" required className="w-full px-3 py-2 border rounded-md" />
              <input type="email" name="email" defaultValue={editingStudent?.email} placeholder="Email" required className="w-full px-3 py-2 border rounded-md" />
              <input type="tel" name="phone" defaultValue={editingStudent?.phone?.replace("+91", "")} placeholder="Phone (10 digits)" required className="w-full px-3 py-2 border rounded-md" />
              <input type="date" name="joinDate" defaultValue={editingStudent?.joinDate ? new Date(editingStudent.joinDate).toISOString().split('T')[0] : new Date().toISOString().split("T")[0]} required className="w-full px-3 py-2 border rounded-md" />
              <input type="number" name="totalFee" defaultValue={editingStudent?.totalFee || 18000} placeholder="Total Fee" required className="w-full px-3 py-2 border rounded-md" />
              <input type="number" name="paidAmount" defaultValue={editingStudent?.paidAmount || 0} placeholder="Paid Amount" className="w-full px-3 py-2 border rounded-md" />
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => { setShowStudentModal(false); setEditingStudent(null); }} className="px-5 py-2 border rounded text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-green-600 text-white rounded hover:bg-green-700">{editingStudent ? "Update" : "Add"} Student</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseManagement;