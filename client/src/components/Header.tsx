"use client";

import { useSelector } from "react-redux";
import { RootState } from "@/store";

import { Bell, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { Button } from "./ui/Button";

export function Header() {
    const user = useSelector((state: RootState) => state.auth.user);
    const [alerts, setAlerts] = useState({ lowStockCount: 0, outOfStockCount: 0, totalAlerts: 0 });

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const { data } = await api.get("/dashboard/alerts");
                setAlerts(data);
            } catch (error) {
                console.error("Failed to fetch alerts", error);
            }
        };
        fetchAlerts();

        // Poll every minute
        const interval = setInterval(fetchAlerts, 60000);
        return () => clearInterval(interval);
    }, []);

    return (
        <header className="flex h-14 items-center gap-4 border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex flex-1 items-center justify-between">
                <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
                <div className="flex items-center gap-4">

                    {/* Notification Bell */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <button className="relative p-2 rounded-full hover:bg-muted transition-colors">
                                <Bell className="h-5 w-5 text-muted-foreground" />
                                {alerts.totalAlerts > 0 && (
                                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-in zoom-in">
                                        {alerts.totalAlerts}
                                    </span>
                                )}
                            </button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-64 p-4">
                            <h4 className="font-semibold mb-2 text-sm leading-none">Notifications</h4>
                            {alerts.totalAlerts === 0 ? (
                                <p className="text-sm text-muted-foreground">No new alerts.</p>
                            ) : (
                                <div className="space-y-2 text-sm">
                                    {alerts.outOfStockCount > 0 && (
                                        <div className="flex items-start gap-2 text-destructive bg-destructive/10 p-2 rounded-md">
                                            <span className="h-2 w-2 mt-1.5 rounded-full bg-destructive animate-pulse" />
                                            <div>
                                                <p className="font-medium">{alerts.outOfStockCount} items Out of Stock</p>
                                                <p className="text-xs opacity-90">Restock immediately.</p>
                                            </div>
                                        </div>
                                    )}
                                    {alerts.lowStockCount > 0 && (
                                        <div className="flex items-start gap-2 text-orange-500 bg-orange-500/10 p-2 rounded-md">
                                            <span className="h-2 w-2 mt-1.5 rounded-full bg-orange-500" />
                                            <div>
                                                <p className="font-medium">{alerts.lowStockCount} items Low Stock</p>
                                                <p className="text-xs opacity-90">Running low (≤10).</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </PopoverContent>
                    </Popover>

                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary border border-primary/20">
                        {user?.name ? user.name.charAt(0).toUpperCase() : (user?.email?.charAt(0).toUpperCase() || "U")}
                    </div>
                </div>
            </div>
        </header>
    );
}
