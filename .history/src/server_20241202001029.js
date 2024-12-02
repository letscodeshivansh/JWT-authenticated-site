const express = require('express');
const http = require('http');
const path = require('path');
const multer = require('multer');
const session = require('express-session');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const {User} = require('./mongodb');  


const app = express();
const server = http.createServer(app);

app.use(express.json());

const parentDir = path.join(__dirname, '../');

// Connect to MongoDB 
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.set('views', path.join(parentDir, 'templates'));
app.set('view engine', 'ejs');

app.use(express.static(path.join(parentDir, 'public')));
app.use(express.static(path.join(parentDir, 'assets')));

app.get('/', async (req, res) => {
  res.render('login');
});
app.get('/landing', async (req, res) => {
  res.render('landing');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });

    if (!user) {
      return res.status(401).render('login', { error: 'Invalid username or password' });
    }

    req.session.loggedInUsername = username;
    res.redirect('/index');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error logging in');
  }
});

app.get('/signup', (req, res) => {
  res.render('signup');
}); 

app.post(
    '/signup',
    [
      // Validation middleware
      check('username')
        .isLength({ min: 3 })
        .withMessage('Username must be at least 3 characters long'),
      check('password')
        .isLength({ min: 5 })
        .withMessage('Password must be at least 5 characters long'),
    ],
    async (req, res) => {
      // Handle validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).render('signup', { error: errors.array()[0].msg });
      }
  
      try {
        const { username, password } = req.body;
  
        // Check if the user already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
          return res
            .status(400)
            .render('signup', { error: 'Username already exists' });
        }
  
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
  
        // Create and save the new user
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
  
        // Store the username in the session
        req.session.loggedInUsername = username;
  
        // Redirect to the index page or dashboard
        res.redirect('/index');
      } catch (error) {
        console.error('Signup error:', error);
        res
          .status(500)
          .render('signup', { error: 'An error occurred during signup. Please try again.' });
      }
    }
  );
  

const port = 6969;
server.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${port}`);
});
