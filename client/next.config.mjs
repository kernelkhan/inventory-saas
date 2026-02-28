/** @type {import('next').NextConfig} */
const nextConfig = {
    typescript: {
        ignoreBuildErrors: true,
    },
    rewrites: async () => {
        const isProd = process.env.NODE_ENV === 'production';
        const apiUrl = process.env.NEXT_PUBLIC_API_URL ||
            (isProd
                ? "https://inventory-saas-backend-ntiv.onrender.com"
                : "http://localhost:3001");
        return [
            {
                source: "/api/:path*",
                destination: `${apiUrl}/api/:path*`,
            },
        ];
    },
};

export default nextConfig;
