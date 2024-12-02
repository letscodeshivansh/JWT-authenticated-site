const express = require('express');
const http = require('http');
const path = require('path');
const session = require('express-session');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const { User } = require('./mongodb');
require('dotenv').config();

// Initialize Express App and Server
const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    secret: 'yourSecretKey',
    resave: false,
    saveUninitialized: true,
  })
);

// Set Static Files and View Engine
const parentDir = path.join(__dirname, '../');
app.use(express.static(path.join(parentDir, 'public')));
app.use(express.static(path.join(parentDir, 'assets')));
app.set('views', path.join(parentDir, 'templates'));
app.set('view engine', 'ejs');

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// JWT Authentication Middleware
const authenticateJWT = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access Denied: No Token Provided!' });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid Token' });
  }
};

// Role-Based Authorization Middleware
const authorizeRole = (role) => {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Access Denied: Insufficient Permissions!' });
    }
    next();
  };
};

// Routes

// Landing Page
app.get('/', (req, res) => res.render('login'));
app.get('/login', (req, res) => res.render('login'));
app.get('/signup', (req, res) => res.render('signup'));

// Protected Landing Route
app.get('/landing', authenticateJWT, (req, res) => {
  const { username, role } = req.user;
  res.render('landing', { loggedInUsername: username, role });
});

// User Profile
app.get('/profile', authenticateJWT, (req, res) => {
  if (req.user.role !== 'User') {
    return res.status(403).send('Access Denied!');
  }
  res.render('user');
});

// Admin Panel
app.get('/admin', authenticateJWT, authorizeRole('Admin'), (req, res) => res.render('admin'));

// Logout
app.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

// Login Handler
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).render('login', { error: 'Invalid username or password' });
    }

    const token = jwt.sign({ username: user.username, role: user.role }, process.env.JWT_SECRET);
    res.cookie('token', token).redirect('/index');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error logging in');
  }
});

// Signup Handler
app.post(
  '/signup',
  [
    check('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),
    check('password').isLength({ min: 5 }).withMessage('Password must be at least 5 characters long'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('signup', { error: errors.array()[0].msg });
    }

    try {
      const { username, password, role } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = new User({ username, password: hashedPassword, role });
      await newUser.save();

      res.redirect('/login');
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).render('signup', { error: 'An error occurred during signup. Please try again.' });
    }
  }
);

const port = 6969;
server.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${port}`);
});
