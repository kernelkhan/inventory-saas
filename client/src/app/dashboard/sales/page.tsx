"use client";

import { useEffect, useState } from "react";
import { Plus, ShoppingCart, Download, Printer } from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { generateInvoice } from "@/lib/invoice";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "@/lib/axios";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Types
interface Product {
    id: number;
    name: string;
    sku: string;
    quantity: number;
    price: number;
}

interface Sale {
    id: number;
    productId: number;
    quantitySold: number;
    saleDate: string;
    product: Product;
}

// Validation Schema
const saleSchema = z.object({
    productId: z.coerce.number().positive("Please select a product"),
    quantitySold: z.coerce.number().int().positive("Quantity must be greater than 0"),
});

type SaleForm = z.infer<typeof saleSchema>;

export default function SalesPage() {
    const user = useSelector((state: RootState) => state.auth.user);
    const [sales, setSales] = useState<Sale[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SaleForm>({
        resolver: zodResolver(saleSchema),
        defaultValues: {
            quantitySold: 1
        }
    });

    // Fetch Data
    const fetchData = async () => {
        try {
            const [salesRes, productsRes] = await Promise.all([
                api.get("/sales"),
                api.get("/products")
            ]);
            setSales(salesRes.data);
            setProducts(productsRes.data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load sales data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const onAddSale = async (data: SaleForm) => {
        try {
            await api.post("/sales", data);
            setIsAddOpen(false);
            reset();
            fetchData();
            toast.success("Sale recorded successfully!");
        } catch (error: any) {
            console.error("Sale failed", error);
            const msg = error.response?.data?.error || "Failed to record sale";
            toast.error(msg);
        }
    };

    const handleExport = () => {
        if (sales.length === 0) return toast.error("No sales to export");

        const headers = ["ID", "Date", "Product", "Quantity", "Total Amount"];
        const escapeCsv = (txt: any) => `"${String(txt).replace(/"/g, '""')}"`;

        const rows = sales.map(s => [
            s.id,
            new Date(s.saleDate).toLocaleString(),
            s.product.name,
            s.quantitySold,
            (s.quantitySold * s.product.price).toFixed(2)
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.map(escapeCsv).join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "sales_report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Sales</h2>
                    <p className="text-muted-foreground">
                        Record new sales and track your transaction history.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" /> Export
                    </Button>
                    <Button onClick={() => setIsAddOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> New Sale
                    </Button>
                </div>
            </div>

            {/* New Sale Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Record New Sale</DialogTitle>
                        <DialogDescription>
                            Select a product and enter the quantity sold.
                        </DialogDescription>
                        <DialogClose onClick={() => setIsAddOpen(false)} />
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onAddSale)} className="space-y-4">
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Product
                                </label>
                                <select
                                    {...register("productId")}
                                    className={cn(
                                        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                                        errors.productId && "border-destructive focus-visible:ring-destructive"
                                    )}
                                >
                                    <option value="">Select a product...</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id} disabled={p.quantity === 0}>
                                            {p.name} (Stock: {p.quantity}) - ₹{p.price}
                                        </option>
                                    ))}
                                </select>
                                {errors.productId && <p className="text-sm text-destructive">{errors.productId.message}</p>}
                            </div>

                            <Input
                                label="Quantity Sold"
                                type="number"
                                placeholder="1"
                                {...register("quantitySold")}
                                error={errors.quantitySold?.message}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                            <Button type="submit" isLoading={isSubmitting}>Confirm Sale</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base font-medium">Recent Transactions</CardTitle>
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex h-[200px] items-center justify-center text-muted-foreground">Loading...</div>
                    ) : sales.length === 0 ? (
                        <div className="flex h-[400px] items-center justify-center rounded-md border border-dashed text-muted-foreground">
                            No recent sales found. Start selling to see data here.
                        </div>
                    ) : (
                        <div className="rounded-md border mt-4">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted text-muted-foreground font-medium">
                                    <tr>
                                        <th className="p-4">Date</th>
                                        <th className="p-4">Product</th>
                                        <th className="p-4">Quantity</th>
                                        <th className="p-4">Total Amount</th>
                                        <th className="p-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sales.map((sale) => (
                                        <tr key={sale.id} className="border-t border-border hover:bg-muted/50 transition-colors">
                                            <td className="p-4 text-muted-foreground">
                                                {new Date(sale.saleDate).toLocaleDateString()} {new Date(sale.saleDate).toLocaleTimeString()}
                                            </td>
                                            <td className="p-4 font-medium text-foreground">{sale.product.name}</td>
                                            <td className="p-4 text-foreground">{sale.quantitySold}</td>
                                            <td className="p-4 font-medium text-primary">
                                                ₹{(sale.quantitySold * sale.product.price).toFixed(2)}
                                            </td>
                                            <td className="p-4">
                                                <Button size="sm" variant="ghost" onClick={() => generateInvoice(sale, user)}>
                                                    <Printer className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
