const Razorpay = require("razorpay");
const crypto = require("crypto");
const prisma = require("../../config/db");
const { sendSuccess, sendError } = require("../../utils/response");

const getUserId = (req) => {
  return req.user?.id || req.user?.sub || null;
};

const createOrder = async (req, res) => {
  try {
    const userId = getUserId(req);
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!userId) {
      return sendError(res, {
        status: 401,
        message: "Authentication required",
      });
    }

    if (!keyId || !keySecret) {
      return sendError(res, {
        status: 503,
        message: "Payment service not configured",
      });
    }

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      return sendError(res, {
        status: 400,
        message: "Cart is empty",
      });
    }

    const hasInactiveProduct = cart.items.some(
      (item) => !item.product || !item.product.isActive
    );

    if (hasInactiveProduct) {
      return sendError(res, {
        status: 400,
        message: "Cart contains inactive or unavailable products",
      });
    }

    const totalAmount = cart.items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const amountInPaise = Math.round(totalAmount * 100);

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
    });

    const { shippingAddress, city, zip, phone } = req.body;

    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          userId,
          totalAmount,
          status: "PENDING",
          razorpayOrderId: razorpayOrder.id,
          paymentStatus: "PENDING",
          shippingAddress,
          city,
          zip,
          phone,
        },
      });

      const orderItemsData = cart.items.map((item) => ({
        orderId: createdOrder.id,
        productId: item.productId,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
      }));

      await tx.orderItem.createMany({
        data: orderItemsData,
      });

      return createdOrder;
    });

    return sendSuccess(res, {
      data: {
        orderId: order.id,
        razorpayOrderId: razorpayOrder.id,
        amount: amountInPaise,
      },
    });
  } catch (error) {
    console.error("Create Payment Order Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const userId = getUserId(req);
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!userId) {
      return sendError(res, {
        status: 401,
        message: "Authentication required",
      });
    }

    if (!keySecret) {
      return sendError(res, {
        status: 503,
        message: "Payment service not configured",
      });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return sendError(res, {
        status: 400,
        message: "razorpay_order_id, razorpay_payment_id and razorpay_signature are required",
      });
    }

    const order = await prisma.order.findFirst({
      where: {
        userId,
        razorpayOrderId: razorpay_order_id,
      },
      select: {
        id: true,
        paymentStatus: true,
        status: true,
      },
    });

    if (!order) {
      return sendError(res, {
        status: 404,
        message: "Order not found",
      });
    }

    if (order.paymentStatus === "PAID") {
      return sendSuccess(res, {
        message: "Payment already verified",
        data: {
          orderId: order.id,
          paymentStatus: order.paymentStatus,
          status: order.status,
        },
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return sendError(res, {
        status: 400,
        message: "Invalid payment signature",
      });
    }

    const cart = await prisma.cart.findUnique({
      where: { userId },
      select: { id: true },
    });

    const shouldClearCart = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.order.updateMany({
        where: {
          id: order.id,
          paymentStatus: {
            not: "PAID",
          },
        },
        data: {
          paymentStatus: "PAID",
          status: "CONFIRMED",
        },
      });

      if (updateResult.count === 0) {
        return false;
      }

      if (cart) {
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id },
        });
      }

      return true;
    });

    if (!shouldClearCart) {
      return sendSuccess(res, {
        message: "Payment already verified",
        data: {
          orderId: order.id,
          paymentStatus: "PAID",
          status: "CONFIRMED",
        },
      });
    }

    return sendSuccess(res, {
      message: "Payment verified successfully",
      data: {
        orderId: order.id,
        paymentStatus: "PAID",
        status: "CONFIRMED",
      },
    });
  } catch (error) {
    console.error("Verify Payment Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
};
