const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = [
    process.env.FRONTEND_URL,
    "http://localhost:3000",
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, Postman)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true
}));
app.use(express.json({ limit: "50mb" }));
app.use(cookieParser());

// Computed Health check info
app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date() });
});

// Import Routes
const authRoutes = require("./routes/auth.routes");
const productRoutes = require("./routes/product.routes");

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/sales", require("./routes/sales.routes"));
app.use("/api/dashboard", require("./routes/dashboard.routes"));
app.use("/api/users", require("./routes/user.routes"));
app.use("/api/organization", require("./routes/organization.routes"));

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
