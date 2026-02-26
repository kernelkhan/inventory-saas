const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: "Access denied" });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Auth verified:", verified);
        req.user = verified;
        next();
    } catch (error) {
        res.status(401).json({ error: "Invalid or expired token" });
    }
};

module.exports = verifyToken;
