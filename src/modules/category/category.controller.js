const slugify = require("slugify");
const prisma = require("../../config/db");

const buildTree = (categories, parentId = null) => {
	return categories
		.filter((category) => category.parentId === parentId)
		.map((category) => ({
			...category,
			children: buildTree(categories, category.id),
		}));
};

const generateUniqueSlug = async (name, excludeId) => {
	const baseSlug = slugify(name, { lower: true, strict: true, trim: true });
	const safeBaseSlug = baseSlug || `category-${Date.now()}`;

	let candidateSlug = safeBaseSlug;
	let suffix = 1;

	while (true) {
		const existingCategory = await prisma.category.findFirst({
			where: {
				slug: candidateSlug,
				id: excludeId ? { not: excludeId } : undefined,
			},
			select: { id: true },
		});

		if (!existingCategory) {
			return candidateSlug;
		}

		suffix += 1;
		candidateSlug = `${safeBaseSlug}-${suffix}`;
	}
};

const wouldCreateCycle = (categories, categoryId, nextParentId) => {
	if (!nextParentId) {
		return false;
	}

	let currentParentId = nextParentId;

	while (currentParentId) {
		if (currentParentId === categoryId) {
			return true;
		}

		const parentCategory = categories.find(
			(category) => category.id === currentParentId
		);

		currentParentId = parentCategory ? parentCategory.parentId : null;
	}

	return false;
};

const createCategory = async (req, res) => {
	try {
		const { name, description, parentId } = req.body;

		if (!name || !name.trim()) {
			return res.status(400).json({
				success: false,
				message: "Category name is required",
			});
		}

		if (parentId) {
			const parentCategory = await prisma.category.findUnique({
				where: { id: parentId },
				select: { id: true },
			});

			if (!parentCategory) {
				return res.status(404).json({
					success: false,
					message: "Parent category not found",
				});
			}
		}

		const slug = await generateUniqueSlug(name);

		const category = await prisma.category.create({
			data: {
				name: name.trim(),
				slug,
				description: description?.trim() || null,
				parentId: parentId || null,
			},
		});

		return res.status(201).json({
			success: true,
			data: category,
		});
	} catch (error) {
		console.error("Create Category Error:", error);
		return res.status(500).json({
			success: false,
			message: "Internal server error",
		});
	}
};

const updateCategory = async (req, res) => {
	try {
		const { id } = req.params;
		const { name, description, parentId, isActive } = req.body;

		const existingCategory = await prisma.category.findUnique({
			where: { id },
			select: { id: true, name: true },
		});

		if (!existingCategory) {
			return res.status(404).json({
				success: false,
				message: "Category not found",
			});
		}

		if (parentId === id) {
			return res.status(400).json({
				success: false,
				message: "Category cannot be its own parent",
			});
		}

		if (parentId) {
			const categories = await prisma.category.findMany({
				select: { id: true, parentId: true },
			});

			const parentCategory = categories.find((category) => category.id === parentId);

			if (!parentCategory) {
				return res.status(404).json({
					success: false,
					message: "Parent category not found",
				});
			}

			if (wouldCreateCycle(categories, id, parentId)) {
				return res.status(400).json({
					success: false,
					message: "Invalid parent category hierarchy",
				});
			}
		}

		const nextName = typeof name === "string" ? name.trim() : undefined;
		const shouldRegenerateSlug = !!nextName && nextName !== existingCategory.name;
		const nextSlug = shouldRegenerateSlug
			? await generateUniqueSlug(nextName, id)
			: undefined;

		const category = await prisma.category.update({
			where: { id },
			data: {
				name: nextName,
				slug: nextSlug,
				description:
					description === undefined
						? undefined
						: description?.trim() || null,
				parentId: parentId === undefined ? undefined : parentId || null,
				isActive: typeof isActive === "boolean" ? isActive : undefined,
			},
		});

		return res.status(200).json({
			success: true,
			data: category,
		});
	} catch (error) {
		console.error("Update Category Error:", error);
		return res.status(500).json({
			success: false,
			message: "Internal server error",
		});
	}
};

const deactivateCategory = async (req, res) => {
	try {
		const { id } = req.params;

		const category = await prisma.category.update({
			where: { id },
			data: { isActive: false },
		});

		return res.status(200).json({
			success: true,
			data: category,
		});
	} catch (error) {
		console.error("Deactivate Category Error:", error);

		if (error.code === "P2025") {
			return res.status(404).json({
				success: false,
				message: "Category not found",
			});
		}

		return res.status(500).json({
			success: false,
			message: "Internal server error",
		});
	}
};

const getAllCategoriesAdmin = async (req, res) => {
	try {
		const categories = await prisma.category.findMany({
			include: {
				parent: {
					select: {
						id: true,
						name: true,
						slug: true,
					},
				},
				_count: {
					select: {
						children: true,
						products: true,
					},
				},
			},
			orderBy: [{ createdAt: "desc" }],
		});

		return res.status(200).json({
			success: true,
			data: categories,
		});
	} catch (error) {
		console.error("Get All Categories Admin Error:", error);
		return res.status(500).json({
			success: false,
			message: "Internal server error",
		});
	}
};

const getCategoriesTree = async (req, res) => {
	try {
		const categories = await prisma.category.findMany({
			where: { isActive: true },
			select: {
				id: true,
				name: true,
				slug: true,
				description: true,
				parentId: true,
				isActive: true,
			},
			orderBy: [{ name: "asc" }],
		});

		const tree = buildTree(categories);

		return res.status(200).json({
			success: true,
			data: tree,
		});
	} catch (error) {
		console.error("Get Categories Tree Error:", error);
		return res.status(500).json({
			success: false,
			message: "Internal server error",
		});
	}
};

const getCategoryBySlug = async (req, res) => {
	try {
		const { slug } = req.params;

		const category = await prisma.category.findFirst({
			where: {
				slug,
				isActive: true,
			},
			include: {
				products: {
					where: { isActive: true },
					orderBy: { createdAt: "desc" },
				},
			},
		});

		if (!category) {
			return res.status(404).json({
				success: false,
				message: "Category not found",
			});
		}

		return res.status(200).json({
			success: true,
			data: category,
		});
	} catch (error) {
		console.error("Get Category By Slug Error:", error);
		return res.status(500).json({
			success: false,
			message: "Internal server error",
		});
	}
};

module.exports = {
	createCategory,
	updateCategory,
	deactivateCategory,
	getAllCategoriesAdmin,
	getCategoriesTree,
	getCategoryBySlug,
};
