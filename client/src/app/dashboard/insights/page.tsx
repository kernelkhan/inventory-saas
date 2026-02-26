"use client";

import { useEffect, useState } from "react";
import { Sparkles, TrendingUp, AlertTriangle, CheckCircle, Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import api from "@/lib/axios";
import { cn } from "@/lib/utils";

interface Insight {
    id: number;
    name: string;
    sku: string;
    stock: number;
    dailyVelocity: string;
    daysRemaining: number;
    status: "Critical" | "Low" | "Healthy" | "Overstocked";
    recommendation: string;
    score: number;
}

export default function InsightsPage() {
    const [insights, setInsights] = useState<Insight[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("All");

    useEffect(() => {
        const fetchInsights = async () => {
            try {
                const res = await api.get("/dashboard/insights");
                setInsights(res.data);
            } catch (error) {
                console.error("Failed to load insights", error);
            } finally {
                setLoading(false);
            }
        };
        fetchInsights();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Critical": return "text-red-500 bg-red-500/10 border-red-500/20";
            case "Low": return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
            case "Overstocked": return "text-blue-500 bg-blue-500/10 border-blue-500/20";
            default: return "text-green-500 bg-green-500/10 border-green-500/20";
        }
    };

    const getCardGlow = (status: string) => {
        switch (status) {
            case "Critical": return "hover:shadow-red-500/20 hover:border-red-500/50";
            case "Low": return "hover:shadow-yellow-500/20 hover:border-yellow-500/50";
            case "Overstocked": return "hover:shadow-blue-500/20 hover:border-blue-500/50";
            default: return "hover:shadow-green-500/20 hover:border-green-500/50";
        }
    };

    const filteredInsights = insights.filter(item => filter === "All" || item.status === filter);

    if (loading) return <div className="p-8 text-center text-muted-foreground">Analyzing inventory data...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-xl bg-primary/10">
                        <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-foreground">AI Insights</h2>
                        <p className="text-muted-foreground">Smart forecasts and inventory health recommendations.</p>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex bg-muted/50 p-1 rounded-lg">
                    {["All", "Critical", "Low", "Overstocked", "Healthy"].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status as "All" | "Critical" | "Low" | "Overstocked" | "Healthy")}
                            className={cn(
                                "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                                filter === status
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                            )}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredInsights.map((item) => (
                    <Card key={item.id} className={cn(
                        "transition-all duration-300 hover:-translate-y-1 hover:shadow-xl border-l-[6px] group relative overflow-hidden",
                        getCardGlow(item.status)
                    )} style={{
                        borderLeftColor: item.status === 'Critical' ? '#ef4444' :
                            item.status === 'Low' ? '#eab308' :
                                item.status === 'Overstocked' ? '#3b82f6' : '#22c55e'
                    }}>
                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            {/* Potential action button area */}
                        </div>

                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-lg">{item.name}</CardTitle>
                                    <CardDescription>SKU: {item.sku}</CardDescription>
                                </div>
                                <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold border", getStatusColor(item.status))}>
                                    {item.status}
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Current Stock</p>
                                    <p className="font-medium text-foreground text-lg">{item.stock}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Daily Sales</p>
                                    <p className="font-medium text-foreground text-lg">{item.dailyVelocity}</p>
                                </div>
                            </div>

                            <div className="space-y-2 pt-2 border-t">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <TrendingUp className="h-4 w-4 text-primary" />
                                    <span>Forecast</span>
                                </div>
                                {item.daysRemaining > 365 ? (
                                    <p className="text-sm text-muted-foreground">Stock will last &gt; 1 year</p>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        Stock estimated to run out in <span className="text-foreground font-bold">{item.daysRemaining} days</span>
                                    </p>
                                )}
                            </div>

                            <div className={cn(
                                "p-3 rounded-md text-sm transition-colors",
                                "bg-muted group-hover:bg-primary/5 group-hover:text-primary-foreground"
                            )}>
                                <span className="font-semibold text-primary">AI Recommendation:</span>
                                <p className="text-muted-foreground mt-1 group-hover:text-foreground">{item.recommendation}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {insights.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed rounded-xl">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No Insights Available</h3>
                    <p className="text-muted-foreground">Add products and record sales to generate AI insights.</p>
                </div>
            )}
        </div>
    );
}
