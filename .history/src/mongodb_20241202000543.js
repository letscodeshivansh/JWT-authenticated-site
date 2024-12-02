const mongoose = require("mongoose");

// MongoDB URI
const mongoURI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/VRV";

// Connect to MongoDB
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });

// Define Schema for Users
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 3, // Enforce a minimum length
  },
  password: {
    type: String,
    required: true,
    minlength: 5, // Enforce a minimum length
  }
}, { timestamps: true }); // Adds createdAt and updatedAt fields automatically

// Create User Model
const User = mongoose.model("User", userSchema);

// Export the User model for use in your signup route
module.exports = User;
