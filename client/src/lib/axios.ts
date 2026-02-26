import axios from 'axios';

const api = axios.create({
    baseURL: '/api', // Proxied by Next.js
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Redirect to login if unauthorized (session expired)
            if (typeof window !== 'undefined' && window.location.pathname !== '/') {
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);
