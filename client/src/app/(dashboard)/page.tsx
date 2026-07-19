import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useOutletContext } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { http } from "@/lib/http";

type AuthUser = {
  id: string;
  email: string;
  name: string | null;
};

export default function DashboardPage() {
  const user = useOutletContext<AuthUser>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const { data } = await http.post("/api/auth/logout");
      return data;
    },
    onSuccess: async () => {
      await queryClient.removeQueries({ queryKey: ["auth", "me"] });
      toast.success("Signed out");
      navigate("/login", { replace: true });
    },
    onError: () => {
      toast.error("Failed to sign out");
    },
  });

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>
            You are signed in with an httpOnly JWT cookie.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="rounded-lg border p-3 text-sm">
            <p>
              <span className="text-muted-foreground">Email:</span> {user.email}
            </p>
            {user.name && (
              <p>
                <span className="text-muted-foreground">Name:</span> {user.name}
              </p>
            )}
          </div>
          <Button
            variant="outline"
            disabled={logoutMutation.isPending}
            onClick={() => logoutMutation.mutate()}
          >
            {logoutMutation.isPending ? "Signing out..." : "Sign out"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
