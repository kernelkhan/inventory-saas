"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { RootState } from "@/store";
import { setUser } from "@/store/authSlice";
import api from "@/lib/axios";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const profileSchema = z.object({
    name: z.string().min(1, "Name cannot be empty"),
    companyName: z.string().optional(),
    companyAddress: z.string().optional(),
    password: z.string().optional().refine(val => !val || val.length >= 6, {
        message: "Password must be at least 6 characters if provided",
    }),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function SettingsPage() {
    const user = useSelector((state: RootState) => state.auth.user);
    const dispatch = useDispatch();

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProfileForm>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: user?.name || "",
            companyName: user?.organization?.name || user?.companyName || "",
            companyAddress: user?.companyAddress || "",
            password: ""
        }
    });

    const onSubmit = async (data: ProfileForm) => {
        try {
            const payload: any = {
                name: data.name,
                companyName: data.companyName,
                companyAddress: data.companyAddress
            };
            if (data.password) payload.password = data.password;

            const res = await api.patch("/users/profile", payload);

            // Update Redux state (merge existing user with new data)
            if (user) {
                // Ensure we merge the organization data correctly if returned, or partial update
                const updatedUser = { ...user, ...res.data };
                // If the backend returns organization inside res.data, it's good. 
                // If we changed companyName, we assume org name changed too locally for immediate feedback if needed, 
                // but relying on backend response is safer.
                dispatch(setUser(updatedUser));
            }

            toast.success("Profile & Organization details updated!");
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.error || "Failed to update profile");
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Settings</h2>
            <Card>
                <CardHeader>
                    <CardTitle>Profile & Organization Settings</CardTitle>
                    <CardDescription>
                        Manage your account and organization details.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                label="Display Name"
                                placeholder="Enter your name"
                                {...register("name")}
                                error={errors.name?.message}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Input
                                    label="Organization Name"
                                    placeholder="e.g. My Awesome Shop"
                                    {...register("companyName")}
                                    error={errors.companyName?.message}
                                />
                            </div>
                            <div className="space-y-2">
                                <Input
                                    label="Company Address"
                                    placeholder="e.g. 123 Market St, City"
                                    {...register("companyAddress")}
                                    error={errors.companyAddress?.message}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Input
                                label="Email"
                                disabled
                                value={user?.email || ""}
                            />
                            <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
                        </div>
                        <div className="space-y-2">
                            <Input
                                label="New Password"
                                type="password"
                                placeholder="Leave blank to keep current"
                                {...register("password")}
                                error={errors.password?.message}
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
