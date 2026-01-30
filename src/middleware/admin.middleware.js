const requireAuth = require("./auth.middleware");

const requireAdmin = (req, res, next) => {
  requireAuth(req, res, () => {
    if (req.user.type !== "ADMIN") {
      return res.status(403).json({ message: "Admin access only" });
    }
    next();
  });
};

module.exports = requireAdmin;
