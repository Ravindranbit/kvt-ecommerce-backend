const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// ✅ PUBLIC ROOT ROUTE
app.get("/", (req, res) => {
  res.status(200).send("KVT E-Commerce Backend is running");
});

const requireAuth = require("./middleware/auth.middleware");

app.get("/protected", requireAuth, (req, res) => {
  res.json({
    message: "You are authenticated",
    user: req.user,
  });
});


module.exports = app;
