const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const verifyToken = require("../middleware/auth.middleware");
const bcrypt = require("bcryptjs");
const { z } = require("zod");

const prisma = new PrismaClient();

// Schema for adding a member
const addMemberSchema = z.object({
    email: z.string().email(),
    name: z.string().min(1),
    password: z.string().min(6),
    role: z.enum(["admin", "member"]).default("member")
});

// Middleware to check if user is admin/owner
const verifyAdmin = async (req, res, next) => {
    if (req.user.role !== "admin" && req.user.role !== "owner") {
        return res.status(403).json({ error: "Only admins can manage the team" });
    }
    next();
};

// GET /api/organization/team - List all members
router.get("/team", verifyToken, async (req, res) => {
    try {
        const organizationId = req.user.organizationId;
        if (!organizationId) {
            return res.status(400).json({ error: "You are not part of an organization" });
        }

        const members = await prisma.user.findMany({
            where: { organizationId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(members);
    } catch (err) {
        console.error("Error fetching team:", err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/organization/team - Add a new member
router.post("/team", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const validation = addMemberSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json(validation.error.errors);
        }

        const { email, name, password, role } = validation.data;
        const organizationId = req.user.organizationId;

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: "User with this email already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const newUser = await prisma.user.create({
            data: {
                email,
                name,
                password_hash,
                role,
                organizationId
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true
            }
        });

        res.status(201).json(newUser);
    } catch (err) {
        console.error("Error adding member:", err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/organization/team/:userId - Remove a member
router.delete("/team/:userId", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const userIdToRemove = parseInt(req.params.userId);
        const organizationId = req.user.organizationId;

        // Prevent deleting oneself
        if (userIdToRemove === req.user.id) {
            return res.status(400).json({ error: "You cannot remove yourself" });
        }

        // Check if user exists and is in the same organization
        const userToRemove = await prisma.user.findUnique({
            where: { id: userIdToRemove }
        });

        if (!userToRemove || userToRemove.organizationId !== organizationId) {
            return res.status(404).json({ error: "User not found in your organization" });
        }

        // Optional: Prevent deleting the last owner if you implement multiple owners, 
        // but for now, let's just delete.

        await prisma.user.delete({
            where: { id: userIdToRemove }
        });

        res.json({ message: "User removed successfully" });
    } catch (err) {
        console.error("Error removing member:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
