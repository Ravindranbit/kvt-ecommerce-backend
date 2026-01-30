const express = require("express");
const cors = require("cors");

const authRoutes = require("./modules/auth/auth.routes");

const app = express();

app.use(cors());
app.use(express.json());

// Public root route
app.get("/", (req, res) => {
  res.send("KVT E-Commerce Backend is running");
});

// Auth routes
app.use("/auth", authRoutes);

module.exports = app;
