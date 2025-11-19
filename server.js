require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const helmet = require('helmet');

const authController = require('./controllers/authController');
const courseController = require('./controllers/courseController');
const assignmentController = require('./controllers/assignmentController');
const validation = require('./middleware/validation');
const authMiddleware = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 }
}));

// Views/static routes
app.get('/', (req, res) => { if (req.session && req.session.user) return res.redirect('/home'); res.sendFile(path.join(__dirname, 'public', 'index.html')); });
app.get('/create', (req, res) => { if (req.session && req.session.user) return res.redirect('/home'); res.sendFile(path.join(__dirname, 'public', 'create.html')); });
app.get('/home', (req, res) => { if (!req.session || !req.session.user) return res.redirect('/'); res.sendFile(path.join(__dirname, 'public', 'home.html')); });
app.get('/course/:id', (req, res) => { if (!req.session || !req.session.user) return res.redirect('/'); res.sendFile(path.join(__dirname, 'public', 'course.html')); });

// Auth
app.post('/api/auth/register', validation.registerRules, authController.register);
app.post('/api/auth/login', validation.loginRules, authController.login);
app.get('/logout', authController.logout);

// Courses
app.get('/api/courses', authMiddleware.ensureAuthenticated, courseController.getCourses);
app.put('/api/courses/order', authMiddleware.ensureAuthenticated, courseController.updateOrder);
app.get('/api/courses/:id', authMiddleware.ensureAuthenticated, validation.courseIdParam, courseController.getCourseById);
app.post('/api/courses', authMiddleware.ensureAuthenticated, validation.courseCreateRules, courseController.createCourse);
app.put('/api/courses/:id', authMiddleware.ensureAuthenticated, validation.courseIdParam.concat(validation.courseCreateRules), courseController.updateCourse);
app.delete('/api/courses/:id', authMiddleware.ensureAuthenticated, validation.courseIdParam, courseController.deleteCourse);

// Assignments
app.get('/api/courses/:id/assignments', authMiddleware.ensureAuthenticated, validation.courseIdParam, assignmentController.listAssignments);
app.put('/api/courses/:id/assignments/order', authMiddleware.ensureAuthenticated, assignmentController.updateOrder);
app.post('/api/courses/:id/assignments', authMiddleware.ensureAuthenticated, validation.courseIdParam.concat(validation.assignmentCreateRules), assignmentController.createAssignment);
app.put('/api/courses/:id/assignments/:assignmentId', authMiddleware.ensureAuthenticated, validation.assignmentIdParam.concat(validation.assignmentCreateRules), assignmentController.updateAssignment);
app.delete('/api/courses/:id/assignments/:assignmentId', authMiddleware.ensureAuthenticated, validation.assignmentIdParam, assignmentController.deleteAssignment);

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
