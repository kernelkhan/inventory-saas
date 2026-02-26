const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const verifyToken = require("../middleware/auth.middleware");
const bcrypt = require("bcryptjs");
const { z } = require("zod");

const prisma = new PrismaClient();

// Validation Schema
const updateProfileSchema = z.object({
    name: z.string().min(1, "Name cannot be empty").optional(),
    companyName: z.string().optional(),
    companyAddress: z.string().optional(),
    password: z.string().min(6, "Password must be at least 6 characters").optional(),
});

// Update Profile
router.patch("/profile", verifyToken, async (req, res) => {
    console.log("PATCH /profile hit. User:", req.user.id, "Body:", req.body);
    try {
        const { name, companyName, companyAddress, password } = updateProfileSchema.parse(req.body);
        const userId = req.user.id;

        const dataToUpdate = {};
        if (name) dataToUpdate.name = name;
        if (companyName) {
            dataToUpdate.companyName = companyName;

            // Also update Organization name if user belongs to one
            if (req.user.organizationId) {
                await prisma.organization.update({
                    where: { id: req.user.organizationId },
                    data: { name: companyName }
                });
            }
        }
        if (companyAddress) dataToUpdate.companyAddress = companyAddress;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            dataToUpdate.password_hash = await bcrypt.hash(password, salt);
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: dataToUpdate,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                role: true,
                createdAt: true,
                organization: {
                    select: { name: true }
                }
                // Exclude password_hash
            }
        });

        res.json(updatedUser);
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({ error: err.errors[0].message });
        }
        console.error("Profile Update Error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
