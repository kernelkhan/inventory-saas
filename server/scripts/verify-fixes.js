const axios = require('axios');

const API_URL = 'http://localhost:3001/api';
let authToken = '';
const timestamp = Date.now();
const testUser = {
    email: `verifier_${timestamp}@test.com`,
    password: 'password123',
    name: 'Auto Verifier'
};

async function runVerification() {
    console.log("🚀 Starting System Verification...");

    try {
        // 1. Register
        console.log(`\n1️⃣  Registering User (${testUser.email})...`);
        const regRes = await axios.post(`${API_URL}/auth/register`, testUser);
        console.log("✅ Registered. User ID:", regRes.data.user.id, "Organization ID:", regRes.data.user.organizationId);

        // 2. Login
        console.log(`\n2️⃣  Logging in...`);
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: testUser.email,
            password: testUser.password
        });
        authToken = loginRes.headers['set-cookie'][0].split(';')[0].split('=')[1]; // Basic cookie extraction for this script or use response token if available. 
        // Note: The login route sets a cookie but doesn't return the token in body in all versions. 
        // However, I see the login route code returns user data but the token is in the cookie.
        // Wait, axios actions from node won't automatically persist cookies unless we use a cookie jar, 
        // BUT the backend looks for `req.cookies.token` OR `req.headers.authorization`.
        // Let's check middleware. verifyToken usually checks header too.
        // If not, we might need to change middleware or use cookie header.

        // Let's assume we can grab the token. 
        // Actually, the login response in `auth.routes.js` sets cookie and sends JSON.
        // It DOES NOT send the token in the JSON body.
        // I will extract it from the 'set-cookie' header.
        const cookieHeader = loginRes.headers['set-cookie'];
        let token = '';
        if (cookieHeader) {
            cookieHeader.forEach(cookie => {
                if (cookie.startsWith('token=')) {
                    token = cookie.split(';')[0].split('=')[1];
                }
            });
        }

        if (!token) {
            throw new Error("Could not retrieve token from cookies.");
        }
        console.log("✅ Logged in.");

        const headers = {
            Cookie: `token=${token}`
        };

        // 3. Update Organization Name (Profile Patch)
        console.log(`\n3️⃣  Testing Settings Update (Organization Name)...`);
        const updateRes = await axios.patch(`${API_URL}/users/profile`, {
            companyName: "Verified Tech Corp"
        }, { headers });
        console.log("✅ Profile Updated.");

        // Verify via /me
        const meRes = await axios.get(`${API_URL}/auth/me`, { headers });
        const orgName = meRes.data.organization?.name;
        if (orgName === "Verified Tech Corp") {
            console.log(`   Verified: Organization Name is now '${orgName}'`);
        } else {
            console.error(`   ❌ Failed: Organization Name is '${orgName}'`);
        }

        // 4. Create Product
        console.log(`\n4️⃣  Creating Product...`);
        const productRes = await axios.post(`${API_URL}/products`, {
            name: "Debug Item",
            sku: `DBG-${timestamp}`,
            price: 100,
            quantity: 10
        }, { headers });
        const productId = productRes.data.id;
        console.log(`✅ Product Created (ID: ${productId})`);

        // 5. Update Product (This was the BROKEN part)
        console.log(`\n5️⃣  Updating Product (Testing Fix)...`);
        try {
            const updateProdRes = await axios.patch(`${API_URL}/products/${productId}`, {
                price: 150
            }, { headers });
            console.log(`✅ Product Updated Successfully! New Price: ${updateProdRes.data.price}`);
        } catch (err) {
            console.error("❌ Product Update FAILED. The fix might not be working.");
            console.error(err.response?.data || err.message);
        }

        // 6. Delete Product
        console.log(`\n6️⃣  Deleting Product...`);
        await axios.delete(`${API_URL}/products/${productId}`, { headers });
        console.log("✅ Product Deleted.");

        console.log("\n✨ VERIFICATION COMPLETE: ALL SYSTEMS GO ✨");

    } catch (error) {
        console.error("\n❌ VERIFICATION FAILED");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

runVerification();
