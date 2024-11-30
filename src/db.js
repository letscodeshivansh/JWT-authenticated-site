const express = require('express');
const http = require('http');
const path = require('path');
const multer = require('multer');
const session = require('express-session');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const app = express();
const server = http.createServer(app);

const sessionMiddleware = session({
  secret: 'secretkey',
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 365 * 24 * 60 * 60 * 1000, 
  },
});

app.use(sessionMiddleware);
app.use(express.json());

//for authentication fd
function isAuthenticated(req, res, next) {
  if (req.session.loggedInUsername) {
    return next();
  }
  res.redirect('/login');
}

io.use(require('express-socket.io-session')(sessionMiddleware, {
  autoSave: true
}));

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
  res.render('landing');
});
app.get('/landing', async (req, res) => {
  res.render('landing');
});

//updating multer and storage wala part
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


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


app.post('/signup', [
  check('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),
  check('password').isLength({ min: 5 }).withMessage('Password must be at least 5 characters long')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render('signup', { error: errors.array()[0].msg });
  }

  try {
    const { username, password } = req.body;
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(400).render('signup', { error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    req.session.loggedInUsername = username;
    res.redirect('/index');
  } catch (error) {
    console.error(error);
    res.status(500).render('signup', { error: 'An error occurred during signup. Please try again.' });
  }
});

// GET Profile
app.get("/profile", async (req, res) => {
  if (!req.session.loggedInUsername) {
    return res.redirect("/login");
  }

  try {
    const user = await User.findOne({ username: req.session.loggedInUsername }); // Fetch the logged-in user's profile
    if (!user) {
      return res.status(404).send("User not found");
    }
    res.render("profile", { profile: user });
  } catch (err) {
    console.error("Error fetching profile:", err.message, err.stack);
    res.status(500).send("Server error");
  }
});

// GET Update Profile Page
app.get("/profile/update", async (req, res) => {
  if (!req.session.loggedInUsername) {
    return res.redirect("/login");
  }

  try {
    const user = await User.findOne({ username: req.session.loggedInUsername }); // Fetch the logged-in user's data for the update form
    if (!user) {
      return res.status(404).send("User not found");
    }
    res.render("update_profile", { profile: user });
  } catch (err) {
    console.error("Error fetching profile for update:", err.message);
    res.status(500).send("Server error");
  }
});

// POST Update Profile with Image Upload
app.post(
  "/profile/update",
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "backgroundImage", maxCount: 1 },
  ]),
  async (req, res) => {
    if (!req.session.loggedInUsername) {
      return res.redirect("/login");
    }

    try {
      // Prepare the updates from the form data
      const updates = {
        bio: req.body.bio || "",
        contact: req.body.contact || "",
        experience: req.body.experience ? req.body.experience.split(",").map(item => item.trim()) : [],
        education: req.body.education ? req.body.education.split(",").map(item => item.trim()) : [],
        projects: req.body.projects ? req.body.projects.split(",").map(item => item.trim()) : [],
        skills: req.body.skills ? req.body.skills.split(",").map(item => item.trim()) : [],
      };

      // Add paths for uploaded images, if present
      if (req.files?.mainImage?.[0]) {
        updates.mainImage = `/uploads/${req.files.mainImage[0].filename}`;
      }
      if (req.files?.backgroundImage?.[0]) {
        updates.backgroundImage = `/uploads/${req.files.backgroundImage[0].filename}`;
      }

      // Update the user document in the database
      const updatedUser = await User.findOneAndUpdate(
        { username: req.session.loggedInUsername },
        updates,
        { new: true } // Return the updated document
      );

      if (!updatedUser) {
        return res.status(404).send("User not found");
      }

      res.redirect("/profile"); // Redirect to the profile page after successful update
    } catch (err) {
      console.error("Error updating profile:", err.message);
      res.status(500).send("Server error");
    }
  }
);
module.exports = app;

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong, please try again later');
});

const port = 6969;
server.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${port}`);
});
