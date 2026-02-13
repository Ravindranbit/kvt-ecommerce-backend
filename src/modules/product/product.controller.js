const prisma = require("../../config/db");

/**
 * ADMIN → CREATE PRODUCT
 */
const createProduct = async (req, res) => {
  try {
    const { name, description, price, stock, imageUrl } = req.body;

    if (!name || !description || !price || stock == null) {
      return res.status(400).json({
        message: "Name, description, price and stock are required",
      });
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        stock: parseInt(stock),
        imageUrl,
      },
    });

    return res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    console.error("Create Product Error:", error);
    return res.status(500).json({
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

    return res.status(200).json({
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    console.error("Update Product Error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const deactivateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    return res.status(200).json({
      message: "Product deactivated successfully",
    });
  } catch (error) {
    console.error("Deactivate Product Error:", error);
    return res.status(500).json({
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
        name: search
          ? { contains: search, mode: "insensitive" }
          : undefined,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({ products });
  } catch (error) {
    console.error("List Products Error:", error);
    return res.status(500).json({
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
      return res.status(404).json({
        message: "Product not found",
      });
    }

    return res.status(200).json({ product });
  } catch (error) {
    console.error("Get Product Error:", error);
    return res.status(500).json({
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

