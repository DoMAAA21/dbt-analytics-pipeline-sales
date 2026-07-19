import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Outlet, useNavigate, useOutletContext } from "react-router-dom";
import { toast } from "sonner";

import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { Button } from "@/components/ui/button";
import { http } from "@/lib/http";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
};

export function AppShell() {
  const user = useOutletContext<AuthUser>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const { data } = await http.post("/auth/logout");
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
    <div className="flex min-h-svh bg-background">
      <AppSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-6">
          <div className="text-sm text-muted-foreground">
            Signed in as{" "}
            <span className="font-medium text-foreground">{user.email}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={logoutMutation.isPending}
            onClick={() => logoutMutation.mutate()}
          >
            {logoutMutation.isPending ? "Signing out..." : "Sign out"}
          </Button>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet context={user} />
        </main>
      </div>
    </div>
  );
}
