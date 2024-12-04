const express = require('express');
const http = require('http');
const path = require('path');
const session = require('express-session');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const { User } = require('./configuration/mongodb');
const { generateToken } = require("./utils/jwtUtils");
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
 
// Middleware
app.use(express.json());
app.use(cookieParser()); 
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    secret: 'yourSecretKey',
    resave: false,
    saveUninitialized: true,
  })
);

//Static Files and View Engine
const parentDir = path.join(__dirname, '../');
app.use(express.static(path.join(parentDir, 'public')));
app.use(express.static(path.join(parentDir, 'assets')));
app.set('views', path.join(parentDir, 'templates'));
app.set('view engine', 'ejs');

//MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

  const authenticateJWT = (req, res, next) => {
    const token = req.cookies.token;
    console.log(token)
    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ error: 'Access Denied: No Token Provided!' });
    }
  
    try {
      const verified = jwt.verify(token, secretKey); 
      req.user = verified; 
      console.log('Token verified successfully:', verified);
      next();
    } catch (err) {
      console.error('Token verification failed:', err.message);
      res.status(403).json({ error: 'Invalid Token' });
    }
  };
  

//Role-Based Authorization Middleware
const authorizeRole = (role) => (req, res, next) => {
  if (req.user.role !== role) {
    return res.status(403).json({ error: 'Access Denied: Insufficient Permissions!' });
  }
  next();
};

// Landing Page
app.get('/', (req, res) => res.render('login'));
app.get('/login', (req, res) => res.render('login'));
app.get('/signup', (req, res) => res.render('signup'));

// Role-Based Landing
app.get('/landing', authenticateJWT, (req, res) => {
  const { role } = req.user;
  if (role === 'Admin') return res.redirect('/admin');
  if (role === 'User') return res.redirect('/profile');
  if (role === 'Moderator') return res.redirect('/moderator');
  res.status(403).send('Access Denied: Role not recognized.');
});

// Role-Specific Routes
app.get('/profile', authenticateJWT, authorizeRole('User'), (req, res) => res.render('user'));
app.get('/admin', authenticateJWT, authorizeRole('Admin'), (req, res) => res.render('admin'));
app.get('/moderator', authenticateJWT, authorizeRole('Moderator'), (req, res) => res.render('moderator'));

// Logout
app.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

// Login Handler
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username
    const user = await User.findOne({ username });

    // Validate user existence and password
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).render('login', { error: 'Invalid username or password' });
    }

    // Generate JWT token and store in a cookie
    const token = generateToken(user);
    res.cookie('token', token, { httpOnly: true }); // Store token securely in cookies

    // Redirect based on user role
    switch (user.role) {
      case 'Admin':
        return res.redirect('/admin');
      case 'User':
        return res.redirect('/profile');
      case 'Moderator':
        return res.redirect('/moderator');
      default:
        return res.status(403).render('login', { error: 'Role not recognized. Access Denied.' });
    }
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).send('An error occurred during login.');
  }
});


// Signup Handler
app.post(
  '/signup',
  [
    check('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),
    check('password').isLength({ min: 5 }).withMessage('Password must be at least 5 characters long'),
    check('role').isIn(['Admin', 'User', 'Moderator']).withMessage('Invalid role selected'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('signup', { error: errors.array()[0].msg });
    }

    try {
      const { username, password, role } = req.body;

      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).render('signup', { error: 'Username already exists.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({ username, password: hashedPassword, role });
      await newUser.save();

      res.redirect('/login');
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).render('signup', { error: 'An error occurred during signup.' });
    }
  }
);

const port = 6969;
server.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${port}`);
});
 