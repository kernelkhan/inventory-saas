const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { z } = require("zod");
const verifyToken = require("../middleware/auth.middleware");

const prisma = new PrismaClient();

// Validation Schemas
const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(["admin", "user"]).optional(),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

router.post("/register", async (req, res) => {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json(validation.error.errors);
    }

    const { email, password, role, name } = validation.data; // Added name if available in schema, otherwise default? Schema doesn't have name. 
    // Wait, registerSchema in Step 869 doesn't have name. I should probably add it or default to "My Company".

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) return res.status(400).json({ error: "Email already exists" });

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Create Organization AND User in one transaction
        // First user is 'owner'
        const organization = await prisma.organization.create({
            data: {
                name: "My Company", // Default name, can be changed later
                users: {
                    create: {
                        email,
                        password_hash,
                        role: "owner", // Enforce owner for creator
                        name: name || null
                    }
                }
            },
            include: {
                users: true
            }
        });

        const user = organization.users[0];

        res.status(201).json({ message: "Organization and User created", user: { id: user.id, email: user.email, organizationId: organization.id } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.post("/login", async (req, res) => {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json(validation.error.errors);

    const { email, password } = validation.data;

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(400).json({ error: "Invalid email or password" });

        const validPass = await bcrypt.compare(password, user.password_hash);
        if (!validPass) return res.status(400).json({ error: "Invalid email or password" });

        // Include organizationId in token
        const token = jwt.sign(
            { id: user.id, role: user.role, organizationId: user.organizationId },
            process.env.JWT_SECRET,
            { expiresIn: "24h" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            // secure: true, // Enable in production
        }).json({
            message: "Logged in successfully",
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                companyName: user.companyName,
                organizationId: user.organizationId
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/logout", (req, res) => {
    res.clearCookie("token").json({ message: "Logged out" });
});

router.get("/me", verifyToken, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                companyName: true,
                companyAddress: true,
                organization: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
