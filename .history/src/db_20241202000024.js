const mongoose = require("mongoose");


const mongoURI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/MakeMyWork";

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });
