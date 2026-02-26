"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Package, ShoppingCart, Settings, LogOut, Users, Sparkles } from "lucide-react";
import { useDispatch } from "react-redux";
import { logout } from "@/store/authSlice";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Inventory", href: "/dashboard/inventory", icon: Package },
    { name: "Sales", href: "/dashboard/sales", icon: ShoppingCart },
    { name: "Insights", href: "/dashboard/insights", icon: Sparkles },
    { name: "Team", href: "/dashboard/team", icon: Users },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const dispatch = useDispatch();
    const router = useRouter();
    const [isLogoutOpen, setIsLogoutOpen] = useState(false);

    const handleLogout = () => {
        dispatch(logout());
        router.push("/");
        // Also call API to clear cookie
        // api.post('/auth/logout');
    };

    return (
        <div className="flex h-screen w-64 flex-col border-r bg-card/50 text-card-foreground">
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                <span className="flex items-center gap-2 font-bold tracking-tight text-primary text-xl">
                    <Package className="h-6 w-6" />
                    <span>Inventory</span>
                </span>
            </div>
            <div className="flex-1 overflow-auto py-2">
                <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                                    isActive
                                        ? "bg-muted text-primary"
                                        : "text-muted-foreground hover:bg-muted"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="mt-auto border-t p-4">
                <button
                    onClick={() => setIsLogoutOpen(true)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-primary"
                >
                    <LogOut className="h-4 w-4" />
                    Logout
                </button>
            </div>

            <Dialog open={isLogoutOpen} onOpenChange={setIsLogoutOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Logout</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to log out of your session?
                        </DialogDescription>
                        <DialogClose onClick={() => setIsLogoutOpen(false)} />
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsLogoutOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleLogout}>Logout</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
