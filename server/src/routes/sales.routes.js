const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const verifyToken = require("../middleware/auth.middleware");
const { z } = require("zod");

const prisma = new PrismaClient();

const saleSchema = z.object({
    productId: z.number().int().positive(),
    quantitySold: z.number().int().positive(),
});

// Create New Sale (Record Transaction)
router.post("/", verifyToken, async (req, res) => {
    const validation = saleSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json(validation.error.errors);

    const { productId, quantitySold } = validation.data;

    try {
        // Use transaction to ensure inventory is updated only if sale is created
        const result = await prisma.$transaction(async (prisma) => {
            // 1. Check Product existence and stock
            const product = await prisma.product.findUnique({
                where: { id: productId },
            });

            if (!product) {
                throw new Error("Product not found");
            }

            if (product.quantity < quantitySold) {
                throw new Error(`Insufficient stock. Available: ${product.quantity}`);
            }

            // 2. Decrement Stock
            await prisma.product.update({
                where: { id: productId },
                data: { quantity: product.quantity - quantitySold },
            });

            // 3. Create Sale Record
            const sale = await prisma.sales.create({
                data: {
                    productId,
                    quantitySold,
                    saleDate: new Date(),
                },
                include: {
                    product: true // Return product details with the sale
                }
            });

            return sale;
        });

        res.status(201).json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Get Sales History
router.get("/", verifyToken, async (req, res) => {
    try {
        const sales = await prisma.sales.findMany({
            where: {
                product: {
                    organizationId: req.user.organizationId
                }
            },
            include: {
                product: true,
            },
            orderBy: {
                saleDate: 'desc'
            }
        });
        res.json(sales);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
