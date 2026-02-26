"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { Activity, IndianRupee, Package, ShoppingCart, TrendingUp } from "lucide-react";
import api from "@/lib/axios";

interface RecentSale {
    id: number;
    saleDate: string;
    quantitySold: number;
    product: {
        name: string;
    }
}

interface DashboardStats {
    totalRevenue: number;
    netProfit: number;
    totalSales: number;
    totalProducts: number;
    activeProducts: number;
    monthlyData: any[];
    recentSales: RecentSale[];
    categoryStats: { name: string; value: number }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats>({
        totalRevenue: 0,
        netProfit: 0,
        totalSales: 0,
        totalProducts: 0,
        activeProducts: 0,
        monthlyData: [],
        recentSales: [],
        categoryStats: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get("/dashboard/stats");
                setStats(res.data);
            } catch (error) {
                console.error("Failed to fetch dashboard stats", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading dashboard data...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Revenue"
                    value={`₹${stats.totalRevenue.toFixed(2)}`}
                    icon={IndianRupee}
                    desc="Lifetime Revenue"
                />
                <StatsCard
                    title="Net Profit"
                    value={`₹${(stats.netProfit || 0).toFixed(2)}`}
                    icon={TrendingUp}
                    desc="Total Earnings (Rev - Cost)"
                />
                <StatsCard
                    title="Total Products"
                    value={stats.totalProducts.toString()}
                    icon={Package}
                    desc="Items in Inventory"
                />
                <StatsCard
                    title="Total Sales"
                    value={stats.totalSales.toString()}
                    icon={ShoppingCart}
                    desc="Items sold lifetime"
                />
                <StatsCard
                    title="Active Stock"
                    value={stats.activeProducts.toString()}
                    icon={Activity}
                    desc="Products with stock > 0"
                />
            </div>

            <div className="grid gap-4 md:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Revenue Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.monthlyData}>
                                    <XAxis
                                        dataKey="name"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `₹${value}`}
                                    />
                                    <Tooltip
                                        contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--popover-foreground))', borderRadius: 'var(--radius)' }}
                                        cursor={{ fill: 'hsl(var(--muted))' }}
                                    />
                                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Inventory Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.categoryStats}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {stats.categoryStats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5', borderRadius: '8px' }}
                                        itemStyle={{ color: '#f4f4f5' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-1">
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-8">
                            {stats.recentSales.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No recent sales.</p>
                            ) : (
                                stats.recentSales.map((sale) => (
                                    <div key={sale.id} className="flex items-center">
                                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                                            <ShoppingCart className="h-4 w-4 text-primary" />
                                        </div>
                                        <div className="ml-4 space-y-1">
                                            <p className="text-sm font-medium leading-none">{sale.product.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Sold {sale.quantitySold} units
                                            </p>
                                        </div>
                                        <div className="ml-auto font-medium text-sm text-muted-foreground">
                                            {new Date(sale.saleDate).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

interface StatsCardProps {
    title: string;
    value: string;
    icon: React.ElementType;
    desc: string;
}

function StatsCard({ title, value, icon: Icon, desc }: StatsCardProps) {
    return (
        <Card className="transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:border-primary/50 cursor-pointer group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{desc}</p>
            </CardContent>
        </Card>
    );
}
