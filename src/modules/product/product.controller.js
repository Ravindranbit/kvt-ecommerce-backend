const prisma = require("../../config/db");
const { sendSuccess, sendError } = require("../../utils/response");

/**
 * ADMIN → CREATE PRODUCT
 */
const createProduct = async (req, res) => {
  try {
    const { name, description, price, stock, imageUrl } = req.body;

    if (!name || !description || !price || stock == null) {
      return sendError(res, {
        status: 400,
        message: "Name, description, price and stock are required",
      });
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        stock: parseInt(stock, 10),
        imageUrl,
      },
    });

    return sendSuccess(res, {
      status: 201,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    console.error("Create Product Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.update({
      where: { id },
      data: req.body,
    });

    return sendSuccess(res, {
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    console.error("Update Product Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

const deactivateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    return sendSuccess(res, {
      message: "Product deactivated successfully",
      data: product,
    });
  } catch (error) {
    console.error("Deactivate Product Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

const listProducts = async (req, res) => {
  try {
    const { search } = req.query;

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        name: search ? { contains: search, mode: "insensitive" } : undefined,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return sendSuccess(res, {
      data: products,
    });
  } catch (error) {
    console.error("List Products Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product || !product.isActive) {
      return sendError(res, {
        status: 404,
        message: "Product not found",
      });
    }

    return sendSuccess(res, {
      data: product,
    });
  } catch (error) {
    console.error("Get Product Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

module.exports = {
  createProduct,
  updateProduct,
  deactivateProduct,
  listProducts,
  getProductById,
};
