const bcrypt = require("bcrypt");
const prisma = require("../../config/db");
const { generateUserToken } = require("../../utils/jwt");
const { generateOTP, hashOTP, verifyOTP } = require("../../utils/otp");
const { sendOTP } = require("../../utils/sms");
const { sendSuccess, sendError } = require("../../utils/response");

/**
 * STEP 1: Initiate Registration (Send OTP)
 * POST /auth/register/initiate
 */
const initiateRegistration = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return sendError(res, {
        status: 400,
        message: "All fields are required",
      });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone }],
      },
    });

    if (existingUser) {
      return sendError(res, {
        status: 409,
        message: "User with email or phone already exists",
      });
    }

    const lastOtp = await prisma.otpVerification.findFirst({
      where: { phone },
      orderBy: { createdAt: "desc" },
    });

    if (lastOtp) {
      const timeDiff = (Date.now() - new Date(lastOtp.createdAt).getTime()) / 1000;

      if (timeDiff < 60) {
        return sendError(res, {
          status: 429,
          message: "Please wait before requesting a new OTP",
        });
      }

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
        return sendError(res, {
          status: 429,
          message: "Too many OTP requests. Try again later.",
        });
      }
    }

    const otp = generateOTP();
    const otpHash = await hashOTP(otp);

    await prisma.otpVerification.create({
      data: {
        phone,
        otpHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    await sendOTP(phone, otp);

    return sendSuccess(res, {
      message: "OTP sent to phone number",
      data: { phone },
    });
  } catch (error) {
    console.error("Initiate Registration Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

/**
 * RESEND OTP
 * POST /auth/register/resend-otp
 */
const resendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return sendError(res, {
        status: 400,
        message: "Phone number is required",
      });
    }

    const lastOtp = await prisma.otpVerification.findFirst({
      where: { phone },
      orderBy: { createdAt: "desc" },
    });

    if (!lastOtp) {
      return sendError(res, {
        status: 400,
        message: "No registration attempt found. Please initiate registration.",
      });
    }

    const timeDiff = (Date.now() - new Date(lastOtp.createdAt).getTime()) / 1000;

    if (timeDiff < 60) {
      return sendError(res, {
        status: 429,
        message: "Please wait before requesting a new OTP",
      });
    }

    const otp = generateOTP();
    const otpHash = await hashOTP(otp);

    await prisma.otpVerification.create({
      data: {
        phone,
        otpHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    await sendOTP(phone, otp);

    return sendSuccess(res, {
      message: "OTP resent successfully",
      data: { phone },
    });
  } catch (error) {
    console.error("Resend OTP Error:", error);
    return sendError(res, {
      status: 500,
      message: "Failed to resend OTP",
    });
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
      return sendError(res, {
        status: 400,
        message: "All fields are required",
      });
    }

    const otpRecord = await prisma.otpVerification.findFirst({
      where: { phone },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord || otpRecord.expiresAt < new Date()) {
      return sendError(res, {
        status: 400,
        message: "OTP expired or invalid",
      });
    }

    const isValidOtp = await verifyOTP(otp, otpRecord.otpHash);
    if (!isValidOtp) {
      return sendError(res, {
        status: 400,
        message: "Invalid OTP",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
        isPhoneVerified: true,
      },
    });

    const token = generateUserToken(user);

    return sendSuccess(res, {
      status: 201,
      message: "User registered successfully",
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
        },
      },
    });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

/**
 * USER LOGIN (Email OR Phone)
 * POST /auth/login
 */
const loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return sendError(res, {
        status: 400,
        message: "Identifier and password are required",
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { phone: identifier }],
      },
    });

    if (!user) {
      return sendError(res, {
        status: 401,
        message: "Invalid credentials",
      });
    }

    if (!user.isActive) {
      return sendError(res, {
        status: 403,
        message: "Account is inactive",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return sendError(res, {
        status: 401,
        message: "Invalid credentials",
      });
    }

    const token = generateUserToken(user);

    return sendSuccess(res, {
      message: "Login successful",
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
        },
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

/**
 * GET LOGGED-IN USER
 * GET /auth/me
 */
const getMe = async (req, res) => {
  try {
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
      return sendError(res, {
        status: 404,
        message: "User not found",
      });
    }

    return sendSuccess(res, {
      data: user,
    });
  } catch (error) {
    console.error("Get Me Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

module.exports = {
  initiateRegistration,
  verifyOtpAndRegister,
  loginUser,
  getMe,
  resendOtp,
};
