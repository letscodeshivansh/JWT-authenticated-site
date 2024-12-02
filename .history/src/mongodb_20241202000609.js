const mongoose = require("mongoose");

// MongoDB URI
const mongoURI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/VRV";
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 3, 
  },
  password: {
    type: String,
    required: true,
    minlength: 5, 
  }
}, { timestamps: true }); 

const User = mongoose.model("User", userSchema);
module.exports = User;
