const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "24h";

/**
 * Generate JWT for User
 */
const generateUserToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      type: "USER",
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Generate JWT for Admin
 */
const generateAdminToken = (admin) => {
  return jwt.sign(
    {
      sub: admin.id,
      type: "ADMIN",
      role: admin.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

module.exports = {
  generateUserToken,
  generateAdminToken,
};
