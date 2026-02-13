const bcrypt = require("bcrypt");
const prisma = require("../../config/db");
const { generateUserToken } = require("../../utils/jwt");
const { generateOTP, hashOTP, verifyOTP } = require("../../utils/otp");
const { sendOTP } = require("../../utils/sms");



/**
 * STEP 1: Initiate Registration (Send OTP)
 * POST /auth/register/initiate
 */
const initiateRegistration = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if email or phone already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone }],
      },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "User with email or phone already exists",
      });
    }


  // Check last OTP for this phone
  const lastOtp = await prisma.otpVerification.findFirst({
  where: { phone },
  orderBy: { createdAt: "desc" },
});

if (lastOtp) {
  const timeDiff = (Date.now() - new Date(lastOtp.createdAt).getTime()) / 1000;

  // Cooldown: 60 seconds
  if (timeDiff < 60) {
    return res.status(429).json({
      message: "Please wait before requesting a new OTP",
    });
  }

  // Limit: max 3 OTPs in 10 minutes
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const otpCount = await prisma.otpVerification.count({
    where: {
      phone,
      createdAt: {
        gte: tenMinutesAgo,
      },
    },
  });

  if (otpCount >= 3) {
    return res.status(429).json({
      message: "Too many OTP requests. Try again later.",
    });
  }
}

    // Generate OTP
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);

    // Store OTP
    await prisma.otpVerification.create({
      data: {
        phone,
        otpHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 mins
      },
    });
    
    // Send OTP via SMS
    await sendOTP(phone, otp);


    return res.status(200).json({
      message: "OTP sent to phone number",
    });
  } catch (error) {
    console.error("Initiate Registration Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * STEP 2: Verify OTP & Create User
 * POST /auth/register/verify
 */
const verifyOtpAndRegister = async (req, res) => {
  try {
    const { name, email, phone, password, otp } = req.body;

    if (!name || !email || !phone || !password || !otp) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Get latest OTP
    const otpRecord = await prisma.otpVerification.findFirst({
      where: { phone },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord || otpRecord.expiresAt < new Date()) {
      return res.status(400).json({ message: "OTP expired or invalid" });
    }

    // Verify OTP
    const isValidOtp = await verifyOTP(otp, otpRecord.otpHash);
    if (!isValidOtp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
        isPhoneVerified: true,
      },
    });

    // Generate JWT
    const token = generateUserToken(user);

    return res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  initiateRegistration,
  verifyOtpAndRegister,
};

/**
 * USER LOGIN (Email OR Phone)
 * POST /auth/login
 */
const loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        message: "Identifier and password are required",
      });
    }

    // Find user by email OR phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { phone: identifier }],
      },
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "Account is inactive",
      });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // Generate JWT
    const token = generateUserToken(user);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  initiateRegistration,
  verifyOtpAndRegister,
  loginUser,
};

/**
 * GET LOGGED-IN USER
 * GET /auth/me
 */
const getMe = async (req, res) => {
  try {
    // req.user comes from JWT middleware
    const userId = req.user.sub;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isPhoneVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Get Me Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  initiateRegistration,
  verifyOtpAndRegister,
  loginUser,
  getMe,
};
