const Razorpay = require("razorpay");
const crypto = require("crypto");
const prisma = require("../../config/db");

const getUserId = (req) => {
  return req.user?.id || req.user?.sub || null;
};

const createOrder = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
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
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    const hasInactiveProduct = cart.items.some(
      (item) => !item.product || !item.product.isActive
    );

    if (hasInactiveProduct) {
      return res.status(400).json({
        success: false,
        message: "Cart contains inactive or unavailable products",
      });
    }

    const totalAmount = cart.items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const amountInPaise = Math.round(totalAmount * 100);

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
    });

    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          userId,
          totalAmount,
          status: "PENDING",
          razorpayOrderId: razorpayOrder.id,
          paymentStatus: "PENDING",
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

    return res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        razorpayOrderId: razorpayOrder.id,
        amount: amountInPaise,
      },
    });
  } catch (error) {
    console.error("Create Payment Order Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "razorpay_order_id, razorpay_payment_id and razorpay_signature are required",
      });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    const order = await prisma.order.findFirst({
      where: {
        userId,
        razorpayOrderId: razorpay_order_id,
      },
      select: {
        id: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const cart = await prisma.cart.findUnique({
      where: { userId },
      select: { id: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "PAID",
          status: "CONFIRMED",
        },
      });

      if (cart) {
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id },
        });
      }
    });

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
    });
  } catch (error) {
    console.error("Verify Payment Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
};
