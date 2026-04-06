const express = require("express");
const cors = require("cors");

const authRoutes = require("./modules/auth/auth.routes");

const app = express();
const adminRoutes = require("./modules/admin/admin.routes");
const productRoutes = require("./modules/product/product.routes");
const categoryRoutes = require("./modules/category/category.routes");
const cartRoutes = require("./modules/cart/cart.routes");



app.use(cors());
app.use(express.json());

// Public root route
app.get("/", (req, res) => {
  res.send("KVT E-Commerce Backend is running");
});

// Auth routes
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);

app.use("/products", productRoutes);
app.use("/categories", categoryRoutes);
app.use("/cart", cartRoutes);

module.exports = app;
