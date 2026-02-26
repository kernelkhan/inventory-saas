"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import api from "@/lib/axios";
import { toast } from "sonner";
import { setUser } from "@/store/authSlice";

const schema = z.object({
  email: z.string().email({ message: "Invalid email" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type FormData = z.infer<typeof schema>;

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const router = useRouter();
  const dispatch = useDispatch();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const toggleMode = () => {
    setIsLogin(!isLogin);
    reset();
  };

  const onSubmit = async (data: FormData) => {
    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const response = await api.post(endpoint, data);

      if (response.data.user || response.data.message) {
        if (isLogin) {
          dispatch(setUser(response.data.user));
          toast.success("Welcome back!");
          router.push("/dashboard");
        } else {
          setIsLogin(true);
          toast.success("Registration successful! Please login.");
          reset();
        }
      }
    } catch (err) {
      const error = err as any;
      const msg = error.response?.data?.error || "Something went wrong. Please try again.";
      toast.error(msg);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-xl border-border/50">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            {isLogin ? "Welcome back" : "Create an account"}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? "Enter your credentials to actess your inventory."
              : "Get started with your free inventory management system."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Input
                label="Email"
                type="email"
                placeholder="name@company.com"
                {...register("email")}
                error={errors.email?.message}
              />
            </div>
            <div className="space-y-2">
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                {...register("password")}
                error={errors.password?.message}
              />
            </div>


            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              {isLogin ? "Sign in" : "Sign up"}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <Button
            variant="link"
            onClick={toggleMode}
            className="w-full px-0 font-normal"
            type="button"
          >
            {isLogin
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
