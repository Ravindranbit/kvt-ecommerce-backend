const prisma = require("../../config/db");
const { sendSuccess, sendError } = require("../../utils/response");

const getUserId = (req) => {
  return req.user?.id || req.user?.sub || null;
};

const placeOrder = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return sendError(res, {
        status: 401,
        message: "Authentication required",
      });
    }

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      return sendError(res, {
        status: 400,
        message: "Cart is empty",
      });
    }

    for (const item of cart.items) {
      if (!item.product || !item.product.isActive) {
        return sendError(res, {
          status: 400,
          message: `Product ${item.product?.name || item.productId} is not available`,
        });
      }

      if (item.quantity > item.product.stock) {
        return sendError(res, {
          status: 400,
          message: `Insufficient stock for ${item.product.name}`,
        });
      }
    }

    const totalAmount = cart.items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );

    const order = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId,
          totalAmount,
          status: "PENDING",
        },
      });

      const orderItemsData = cart.items.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
      }));

      await tx.orderItem.createMany({
        data: orderItemsData,
      });

      for (const item of cart.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return order;
    });

    return sendSuccess(res, {
      message: "Order placed successfully",
      data: {
        orderId: order.id,
        totalAmount,
        status: order.status,
      },
    });
  } catch (error) {
    console.error("Place Order Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return sendError(res, {
        status: 401,
        message: "Authentication required",
      });
    }

    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const normalizedOrders = orders.map((order) => ({
      ...order,
      orderItems: order.items,
    }));

    return sendSuccess(res, {
      data: normalizedOrders,
    });
  } catch (error) {
    console.error("Get My Orders Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

module.exports = {
  placeOrder,
  getMyOrders,
};
