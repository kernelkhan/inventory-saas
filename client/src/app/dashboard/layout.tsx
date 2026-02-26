"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { setUser } from "@/store/authSlice";
import api from "@/lib/axios";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const dispatch = useDispatch();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data } = await api.get("/auth/me");
                dispatch(setUser(data));
            } catch (error) {
                // If checking auth fails (e.g. 401), we might want to redirect to login
                // But Middleware usually handles protection. 
                // We just fail silently here or user stays as "guest" in Redux (null).
                console.error("Session restore failed", error);
            }
        };
        checkAuth();
    }, [dispatch]);

    return (
        <div className="flex min-h-screen w-full bg-muted/40">
            <Sidebar />
            <div className="flex flex-1 flex-col sm:gap-4 sm:py-4 sm:pl-14 lg:pl-0">
                <div className="flex flex-col sm:gap-4 sm:pl-0">
                    <Header />
                    <main className="flex-1 p-6 space-y-4">{children}</main>
                </div>
            </div>
        </div>
    );
}
