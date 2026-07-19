import { FormProvider, useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { http } from "@/lib/http";
import {
  LoginForm,
  type LoginFormValues,
} from "./_components/login-form";

export default function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm<LoginFormValues>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (values: LoginFormValues) => {
      const { data } = await http.post("/api/auth/login", values);
      return data;
    },
    onSuccess: async (user) => {
      queryClient.setQueryData(["auth", "me"], user);
      toast.success("Logged in successfully");
      navigate("/dashboard", { replace: true });
    },
    onError: (error) => {
      const message = isAxiosError(error)
        ? (error.response?.data?.message ?? "Invalid email or password")
        : "Invalid email or password";
      toast.error(
        Array.isArray(message) ? message.join(", ") : String(message),
      );
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    loginMutation.mutate(values);
  });

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Enter your credentials to access the analytics dashboard.
          </CardDescription>
        </CardHeader>

        <FormProvider {...form}>
          <form onSubmit={onSubmit}>
            <CardContent>
              <LoginForm />
            </CardContent>

            <CardFooter className="flex flex-col gap-3 border-t-0 bg-transparent">
              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Signing in..." : "Sign in"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                No account?{" "}
                <Link to="/register" className="text-foreground underline">
                  Create one
                </Link>
              </p>
            </CardFooter>
          </form>
        </FormProvider>
      </Card>
    </div>
  );
}
