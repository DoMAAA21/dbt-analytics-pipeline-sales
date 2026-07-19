import { FormProvider, useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
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
import {
  LoginForm,
  type LoginFormValues,
} from "./_components/login-form";

export default function LoginPage() {
  const form = useForm<LoginFormValues>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (values: LoginFormValues) => {
      const { data } = await axios.post("/api/auth/login", values);
      return data;
    },
    onSuccess: () => {
      toast.success("Logged in successfully");
    },
    onError: () => {
      toast.error("Invalid email or password");
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

            <CardFooter className="border-t-0 bg-transparent">
              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Signing in..." : "Sign in"}
              </Button>
            </CardFooter>
          </form>
        </FormProvider>
      </Card>
    </div>
  );
}
