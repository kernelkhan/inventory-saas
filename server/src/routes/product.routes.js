const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const verifyToken = require("../middleware/auth.middleware");
const { z } = require("zod");

const prisma = new PrismaClient();

// Validation Schemas
const createProductSchema = z.object({
    name: z.string().min(1, "Name is required"),
    sku: z.string().min(1, "SKU is required"),
    quantity: z.number().int().min(0, "Quantity must be 0 or more"),
    price: z.number().positive("Price must be positive"),
    costPrice: z.number().min(0).optional(),
    category: z.string().optional(),
    image: z.string().optional(), // Base64 string
});

const updateProductSchema = z.object({
    name: z.string().min(1).optional(),
    sku: z.string().min(1).optional(),
    quantity: z.number().int().min(0).optional(),
    price: z.number().positive().optional(),
    costPrice: z.number().min(0).optional(),
    category: z.string().optional(),
    image: z.string().optional(),
});

// Create Product
router.post("/", verifyToken, async (req, res) => {
    try {
        console.log("POST /products hit");
        console.log("User:", req.user);

        const validation = createProductSchema.safeParse(req.body);
        if (!validation.success) {
            console.error("Validation Error:", validation.error.errors);
            return res.status(400).json(validation.error.errors);
        }

        const { name, sku, quantity, price, costPrice, category, image } = validation.data;
        const organizationId = req.user.organizationId;

        console.log("Payload:", { name, sku, organizationId });

        if (!organizationId) {
            console.error("No Organization ID found in token");
            return res.status(400).json({ error: "User does not belong to an organization" });
        }

        const product = await prisma.product.create({
            data: {
                name,
                sku,
                quantity,
                price,
                costPrice: costPrice || 0,
                category: category || "General",
                image,
                organizationId
            }
        });
        console.log("Product created:", product.id);
        res.status(201).json(product);
    } catch (err) {
        console.error("Error creating product:", err);
        if (err.code === 'P2002') return res.status(400).json({ error: "SKU already exists" });
        res.status(500).json({ error: err.message });
    }
});

// Get All Products
router.get("/", verifyToken, async (req, res) => {
    try {
        console.log("GET /products hit");
        console.log("User Org ID:", req.user.organizationId);

        if (!req.user.organizationId) {
            console.error("No Organization ID in token");
            return res.status(400).json({ error: "User does not belong to an organization. Please log out and log in again." });
        }

        const products = await prisma.product.findMany({
            where: { organizationId: req.user.organizationId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(products);
    } catch (err) {
        console.error("Error fetching products:", err);
        res.status(500).json({ error: err.message });
    }
});

// Update Product
router.patch("/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const validation = updateProductSchema.safeParse(req.body);
        if (!validation.success) return res.status(400).json(validation.error.errors);

        const { name, sku, quantity, price, costPrice, category, image } = validation.data;

        // Ensure user owns product
        const existing = await prisma.product.findUnique({ where: { id: Number(id) } });
        if (!existing || existing.organizationId !== req.user.organizationId) return res.status(403).json({ error: "Access denied" });

        const updated = await prisma.product.update({
            where: { id: Number(id) },
            data: { name, sku, quantity, price, costPrice, category, image }
        });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Bulk Import Products
router.post("/bulk", verifyToken, async (req, res) => {
    try {
        const organizationId = req.user.organizationId;
        if (!organizationId) {
            return res.status(400).json({ error: "No organization found" });
        }

        const products = req.body;
        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ error: "Invalid data format. Expected array of products." });
        }

        const createdProducts = await prisma.$transaction(
            products.map(p => prisma.product.create({
                data: {
                    name: p.name,
                    sku: p.sku,
                    quantity: Number(p.quantity) || 0,
                    price: Number(p.price) || 0,
                    costPrice: Number(p.costPrice) || 0,
                    category: p.category || "General",
                    organizationId
                }
            }))
        );

        res.status(201).json({ message: `Successfully imported ${createdProducts.length} products` });
    } catch (err) {
        console.error("Bulk import error:", err);
        if (err.code === 'P2002') {
            return res.status(400).json({ error: "Duplicate SKU found in import data or database" });
        }
        res.status(500).json({ error: "Failed to import products" });
    }
});

// Delete Product
router.delete("/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        // Ensure user owns product
        const existing = await prisma.product.findUnique({ where: { id: Number(id) } });
        if (!existing || existing.organizationId !== req.user.organizationId) return res.status(403).json({ error: "Access denied" });

        await prisma.product.delete({ where: { id: Number(id) } });
        res.json({ message: "Product deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
