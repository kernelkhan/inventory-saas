const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const verifyToken = require("../middleware/auth.middleware");

const prisma = new PrismaClient();

router.get("/stats", verifyToken, async (req, res) => {
    try {
        const organizationId = req.user.organizationId;
        if (!organizationId) return res.status(400).json({ error: "No organization found" });

        // 1. Total Revenue & Sales Count
        const sales = await prisma.sales.findMany({
            where: {
                product: { organizationId }
            },
            include: {
                product: true
            }
        });

        const totalRevenue = sales.reduce((sum, sale) => sum + (sale.quantitySold * sale.product.price), 0);
        const totalSales = sales.reduce((sum, sale) => sum + sale.quantitySold, 0);
        const netProfit = sales.reduce((sum, sale) => {
            const cost = sale.product.costPrice || 0;
            const profit = (sale.product.price - cost) * sale.quantitySold;
            return sum + profit;
        }, 0);

        // 2. Total Products (Active Items)
        const totalProducts = await prisma.product.count({
            where: { organizationId }
        });

        // 3. Low Stock Items
        const activeProducts = await prisma.product.count({
            where: { organizationId, quantity: { gt: 0 } }
        });

        // 4. Monthly Sales Data for Chart
        const monthlyData = [
            { name: "Jan", total: 0 },
            { name: "Feb", total: 0 },
            { name: "Mar", total: 0 },
            { name: "Apr", total: 0 },
            { name: "May", total: 0 },
            { name: "Jun", total: 0 },
            { name: "Jul", total: 0 },
            { name: "Aug", total: 0 },
            { name: "Sep", total: 0 },
            { name: "Oct", total: 0 },
            { name: "Nov", total: 0 },
            { name: "Dec", total: 0 },
        ];

        sales.forEach(sale => {
            const date = new Date(sale.saleDate);
            const month = date.getMonth(); // 0-11
            const revenue = sale.quantitySold * sale.product.price;
            if (monthlyData[month]) {
                monthlyData[month].total += revenue;
            }
        });

        // 5. Recent Sales (Last 5)
        const recentSales = await prisma.sales.findMany({
            where: {
                product: { organizationId }
            },
            take: 5,
            orderBy: {
                saleDate: 'desc',
            },
            include: {
                product: {
                    select: {
                        name: true,
                        price: true,
                    }
                }
            }
        });

        // 6. Category Distribution
        const categoryGroups = await prisma.product.groupBy({
            by: ['category'],
            where: { organizationId },
            _count: {
                _all: true
            }
        });

        const categoryStats = categoryGroups.map(stat => ({
            name: stat.category,
            value: stat._count._all
        }));

        res.json({
            totalRevenue,
            netProfit,
            totalSales,
            totalProducts,
            activeProducts,
            monthlyData,
            recentSales,
            categoryStats
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
});

// 7. AI Insights Endpoint
router.get("/insights", verifyToken, async (req, res) => {
    try {
        const organizationId = req.user.organizationId;
        const products = await prisma.product.findMany({
            where: { organizationId, quantity: { gt: 0 } },
            include: {
                sales: {
                    where: {
                        saleDate: {
                            gte: new Date(new Date().setDate(new Date().getDate() - 30)) // Last 30 days
                        }
                    }
                }
            }
        });

        const insights = products.map(product => {
            const totalSold30Days = product.sales.reduce((sum, s) => sum + s.quantitySold, 0);
            const dailyVelocity = totalSold30Days / 30; // Avg sales per day

            let daysRemaining = 999;
            if (dailyVelocity > 0) {
                daysRemaining = Math.round(product.quantity / dailyVelocity);
            }

            let status = "Healthy";
            let recommendation = "Maintain current stock levels.";
            let score = 85;

            if (daysRemaining < 7) {
                status = "Critical";
                recommendation = "Restock immediately! Stockout imminent.";
                score = 30;
            } else if (daysRemaining < 21) {
                status = "Low";
                recommendation = "Plan a restock order soon.";
                score = 60;
            } else if (daysRemaining > 90) {
                status = "Overstocked";
                recommendation = "Consider running a promo to clear stock.";
                score = 50;
            }

            return {
                id: product.id,
                name: product.name,
                sku: product.sku,
                stock: product.quantity,
                dailyVelocity: dailyVelocity.toFixed(2),
                daysRemaining,
                status,
                recommendation,
                score
            };
        });

        // Sort by 'Critical' first
        insights.sort((a, b) => a.score - b.score);

        res.json(insights);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch insights" });
    }
});

// 8. Alerts Endpoint (Lightweight for Global Header)
router.get("/alerts", verifyToken, async (req, res) => {
    try {
        const organizationId = req.user.organizationId;
        if (!organizationId) return res.status(400).json({ error: "No organization found" });

        const lowStockCount = await prisma.product.count({
            where: {
                organizationId,
                quantity: { lte: 10, gt: 0 }
            }
        });

        const outOfStockCount = await prisma.product.count({
            where: {
                organizationId,
                quantity: 0
            }
        });

        res.json({
            lowStockCount,
            outOfStockCount,
            totalAlerts: lowStockCount + outOfStockCount
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch alerts" });
    }
});

module.exports = router;
