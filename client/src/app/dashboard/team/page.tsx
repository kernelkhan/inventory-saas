"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Shield, User as UserIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import api from "@/lib/axios";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

// Types
interface TeamMember {
    id: number;
    name: string;
    email: string;
    role: "owner" | "admin" | "member";
    createdAt: string;
}

// Validation Schema
const addMemberSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 chars"),
    role: z.enum(["admin", "member"]).default("member")
});

type AddMemberForm = z.infer<typeof addMemberSchema>;

export default function TeamPage() {
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const currentUser = useSelector((state: RootState) => state.auth.user);

    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AddMemberForm>({
        resolver: zodResolver(addMemberSchema),
        defaultValues: {
            role: "member"
        }
    });

    const fetchTeam = async () => {
        try {
            const res = await api.get("/organization/team");
            setMembers(res.data);
        } catch (error) {
            console.error("Failed to fetch team:", error);
            toast.error("Failed to load team members");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeam();
    }, []);

    const onAddMember = async (data: AddMemberForm) => {
        try {
            await api.post("/organization/team", data);
            toast.success("Member added successfully");
            setIsDialogOpen(false);
            reset();
            fetchTeam();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to add member");
        }
    };

    const removeMember = async (id: number) => {
        if (!confirm("Are you sure you want to remove this member?")) return;
        try {
            await api.delete(`/organization/team/${id}`);
            toast.success("Member removed");
            setMembers(members.filter(m => m.id !== id));
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to remove member");
        }
    };

    const isAdmin = currentUser?.role === "admin" || currentUser?.role === "owner";

    if (loading) return <div className="p-8 text-center">Loading team...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Team Management</h2>
                    <p className="text-muted-foreground">Manage your organization's members and roles.</p>
                </div>
                {isAdmin && (
                    <>
                        <Button onClick={() => setIsDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Member
                        </Button>

                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add New Member</DialogTitle>
                                    <DialogDescription>
                                        Create a new account for your team member.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleSubmit(onAddMember)} className="space-y-4">
                                    <div className="space-y-2">
                                        <Input
                                            label="Name"
                                            placeholder="John Doe"
                                            {...register("name")}
                                            error={errors.name?.message}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Input
                                            label="Email"
                                            type="email"
                                            placeholder="john@example.com"
                                            {...register("email")}
                                            error={errors.email?.message}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Input
                                            label="Temporary Password"
                                            type="password"
                                            placeholder="******"
                                            {...register("password")}
                                            error={errors.password?.message}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            Role
                                        </label>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            {...register("role")}
                                        >
                                            <option value="member">Member</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                    <DialogFooter>
                                        <Button type="submit" disabled={isSubmitting}>
                                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Add Member
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {members.map((member) => (
                    <Card key={member.id} className="transition-all hover:scale-[1.01]">
                        <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <UserIcon className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                                <CardTitle className="text-base">{member.name}</CardTitle>
                                <CardDescription>{member.email}</CardDescription>
                            </div>
                            {isAdmin && member.id !== currentUser?.id && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => removeMember(member.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2 mt-2">
                                <Shield className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium capitalize text-muted-foreground">
                                    {member.role}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
