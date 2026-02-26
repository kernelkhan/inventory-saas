"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Plus, Search, Trash2, Edit, Download, Image as ImageIcon, ScanBarcode } from "lucide-react";
import BarcodeScanner from "@/components/BarcodeScanner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import api from "@/lib/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/Dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import Image from "next/image";

interface Product {
    id: number;
    name: string;
    sku: string;
    quantity: number;
    price: number;
    category?: string;
    image?: string | null;
    costPrice?: number;
}

const CATEGORIES = ["General", "Electronics", "Clothing", "Home & Garden", "Toys", "Books", "Other"];

const productSchema = z.object({
    name: z.string().min(1, "Name is required"),
    sku: z.string().min(1, "SKU is required"),
    quantity: z.coerce.number().min(0, "Quantity must be 0 or more"),
    price: z.coerce.number().min(0, "Price must be 0 or more"),
    category: z.string().optional(),
    image: z.string().optional(),
    costPrice: z.coerce.number().min(0, "Cost Price must be 0 or more").optional(),
});

type ProductForm = z.infer<typeof productSchema>;

export default function InventoryPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<ProductForm>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(productSchema) as any,
        defaultValues: {
            quantity: 0,
            price: 0,
            costPrice: 0,
            category: "General"
        }
    });

    const fetchProducts = async () => {
        try {
            const res = await api.get("/products");
            setProducts(res.data);
        } catch (err) {
            console.error(err);
            toast.error("Failed to fetch products");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    useEffect(() => {
        if (!isAddOpen) {
            setEditingProduct(null);
            setImagePreview(null);
            reset({ name: "", sku: "", quantity: 0, price: 0, category: "General", image: "" });
        }
    }, [isAddOpen, reset]);

    const handleEditClick = (product: Product) => {
        setEditingProduct(product);
        setValue("name", product.name);
        setValue("sku", product.sku);
        setValue("quantity", product.quantity);
        setValue("price", product.price);
        setValue("costPrice", product.costPrice || 0);
        setValue("category", product.category || "General");
        setValue("image", product.image || "");
        setImagePreview(product.image || null);
        setIsAddOpen(true);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                setImagePreview(base64);
                setValue("image", base64);
            };
            reader.readAsDataURL(file);
        }
    };

    const onSubmitProduct = async (data: ProductForm) => {
        try {
            if (editingProduct) {
                await api.patch(`/products/${editingProduct.id}`, data);
                toast.success("Product updated successfully");
            } else {
                await api.post("/products", data);
                toast.success("Product added successfully");
            }
            setIsAddOpen(false);
            fetchProducts();
        } catch (error) {
            console.error("Failed to save product", error);
            toast.error("Failed to save product");
        }
    };

    const handleDeleteClick = (id: number) => {
        setDeleteId(id);
        setIsDeleteOpen(true);
    };

    const confirmDelete = async () => {
        if (deleteId === null) return;
        try {
            await api.delete(`/products/${deleteId}`);
            setProducts(products.filter(p => p.id !== deleteId));
            setIsDeleteOpen(false);
            toast.success("Product deleted successfully");
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete product");
        }
    };

    const handleExport = () => {
        if (products.length === 0) return toast.error("No products to export");

        const headers = ["ID", "Name", "SKU", "Quantity", "Price", "Cost", "Category"];
        const escapeCsv = (txt: any) => `"${String(txt).replace(/"/g, '""')}"`;

        const rows = products.map(p => [
            p.id,
            p.name,
            p.sku,
            p.quantity,
            p.price,
            p.costPrice || 0,
            p.category || "General"
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.map(escapeCsv).join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "inventory_report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredProducts = products.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(search.toLowerCase()))
    );

    const [importConfirmationOpen, setImportConfirmationOpen] = useState(false);
    const [pendingImportData, setPendingImportData] = useState<any[]>([]);

    const handleBulkImport = (file: File) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            // Simple CSV parser
            const rows = text.split("\n").map(row => row.split(","));
            const headers = rows[0].map(h => h.trim());

            // Expected headers: Name, SKU, Quantity, Price, Cost, Category
            const data = rows.slice(1).filter(r => r.length > 1).map(row => {
                const obj: any = {};
                headers.forEach((h, i) => {
                    const key = h.toLowerCase().replace(/ /g, "");
                    let value = row[i]?.replace(/"/g, "").trim();

                    if (key === 'quantity' || key === 'price' || key === 'cost' || key === 'costprice') {
                        value = Number(value) || 0;
                    }
                    // Map common variations
                    if (key === 'cost') obj['costPrice'] = value;
                    else obj[key] = value;
                });
                return obj;
            });

            if (data.length === 0) return toast.error("No valid data found in CSV");

            setPendingImportData(data);
            setImportConfirmationOpen(true);

            // Reset input value so same file can be selected again if needed
            const input = document.getElementById('csvInput') as HTMLInputElement;
            if (input) input.value = '';
        };
        reader.readAsText(file);
    };

    const confirmImport = async () => {
        try {
            await api.post("/products/bulk", pendingImportData);
            toast.success(`Successfully imported ${pendingImportData.length} products`);
            fetchProducts();
            setImportConfirmationOpen(false);
            setPendingImportData([]);
        } catch (error: any) {
            console.error("Import failed", error);
            toast.error(error.response?.data?.error || "Failed to import products");
        }
    };

    const [isScannerOpen, setIsScannerOpen] = useState(false);

    const handleScanResult = (decodedText: string) => {
        setIsScannerOpen(false);
        const existingProduct = products.find(p => p.sku === decodedText);

        if (existingProduct) {
            toast.success(`Product found: ${existingProduct.name}`);
            setSearch(decodedText);
        } else {
            toast.info(`New SKU detected: ${decodedText}. Creating new product...`);
            setIsAddOpen(true);
            setTimeout(() => {
                setValue("sku", decodedText);
            }, 100);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Inventory</h2>
                    <p className="text-muted-foreground">
                        Manage your products, categories, and stock levels.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsScannerOpen(true)}>
                        <ScanBarcode className="mr-2 h-4 w-4" /> Scan
                    </Button>
                    <Button variant="outline" onClick={() => document.getElementById('csvInput')?.click()}>
                        <Download className="mr-2 h-4 w-4 rotate-180" /> Import CSV
                    </Button>
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" /> Export
                    </Button>
                    <Button onClick={() => setIsAddOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Add Product
                    </Button>
                </div>
            </div>

            {/* Scanner Dialog */}
            <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Scan Barcode</DialogTitle>
                        <DialogDescription>Use your camera to scan a product barcode.</DialogDescription>
                        <DialogClose onClick={() => setIsScannerOpen(false)} />
                    </DialogHeader>
                    {isScannerOpen && (
                        <div className="p-4">
                            <BarcodeScanner onScanSuccess={handleScanResult} />
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Create / Edit Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
                        <DialogDescription>
                            {editingProduct ? "Update product details." : "Add a new item to your inventory."}
                        </DialogDescription>
                        <DialogClose onClick={() => setIsAddOpen(false)} />
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onSubmitProduct)} className="space-y-4">
                        <div className="grid gap-4 py-4">
                            {/* Image Upload */}
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative h-24 w-24 overflow-hidden rounded-md border bg-muted flex items-center justify-center">
                                    {imagePreview ? (
                                        <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                                    ) : (
                                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="w-full">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="cursor-pointer"
                                    />
                                </div>
                            </div>

                            <Input label="Name" placeholder="Product Name" {...register("name")} error={errors.name?.message} />

                            <div className="grid grid-cols-2 gap-4">
                                <Input label="SKU" placeholder="Stock Keep Unit" {...register("sku")} error={errors.sku?.message} />
                                <div className="space-y-2">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Category</label>
                                    <select
                                        {...register("category")}
                                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {CATEGORIES.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Quantity" type="number" {...register("quantity")} error={errors.quantity?.message} />
                                <div className="grid grid-cols-2 gap-2">
                                    <Input label="Price (₹)" type="number" step="0.01" {...register("price")} error={errors.price?.message} />
                                    <Input label="Cost (₹)" type="number" step="0.01" {...register("costPrice")} error={errors.costPrice?.message} />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                            <Button type="submit" isLoading={isSubmitting}>{editingProduct ? "Update" : "Save"} Product</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Bulk Import Check Dialog */}
            <input
                type="file"
                id="csvInput"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleBulkImport(file);
                }}
            />

            <Dialog open={importConfirmationOpen} onOpenChange={setImportConfirmationOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Bulk Import</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to add <strong>{pendingImportData.length}</strong> products to your inventory?
                        </DialogDescription>
                        <DialogClose onClick={() => setImportConfirmationOpen(false)} />
                    </DialogHeader>
                    <div className="max-h-60 overflow-y-auto border rounded-md p-2 text-sm">
                        <p className="text-muted-foreground mb-2">Preview of first 5 items:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            {pendingImportData.slice(0, 5).map((item, i) => (
                                <li key={i}>{item.name || "Unknown"} (Qty: {item.quantity})</li>
                            ))}
                            {pendingImportData.length > 5 && <li>...and {pendingImportData.length - 5} more</li>}
                        </ul>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setImportConfirmationOpen(false)}>Cancel</Button>
                        <Button type="button" onClick={confirmImport}>Confirm Import</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Are you sure you want to delete?</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. This will permanently delete the product from our servers.
                        </DialogDescription>
                        <DialogClose onClick={() => setIsDeleteOpen(false)} />
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
                        <Button type="button" variant="destructive" onClick={confirmDelete}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Products</CardTitle>
                        <div className="w-72">
                            <Input
                                placeholder="Search products..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="max-w-sm"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted text-muted-foreground font-medium">
                                <tr>
                                    <th className="p-4 w-[80px]">Image</th>
                                    <th className="p-4">Name</th>
                                    <th className="p-4">Category</th>
                                    <th className="p-4">Stock</th>
                                    <th className="p-4">Price / Cost</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Loading...</td></tr>
                                ) : filteredProducts.length === 0 ? (
                                    <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No products found.</td></tr>
                                ) : (
                                    filteredProducts.map((product) => (
                                        <tr key={product.id} className="border-t border-border hover:bg-muted/50 transition-colors">
                                            <td className="p-4">
                                                <div className="relative h-10 w-10 overflow-hidden rounded-md bg-muted">
                                                    {product.image ? (
                                                        <Image src={product.image} alt={product.name} fill className="object-cover" />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">No Img</div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 font-medium text-foreground">
                                                <div>{product.name}</div>
                                                <div className="text-xs text-muted-foreground">{product.sku}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-500">
                                                    {product.category || "General"}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                                    product.quantity > 10 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                                )}>
                                                    {product.quantity}
                                                </span>
                                            </td>
                                            <td className="p-4 text-foreground">
                                                <div>₹{product.price.toFixed(2)}</div>
                                                <div className="text-xs text-muted-foreground">Cost: ₹{(product.costPrice || 0).toFixed(2)}</div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="sm" onClick={() => handleEditClick(product)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                        onClick={() => handleDeleteClick(product.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
