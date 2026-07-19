import { useOutletContext } from "react-router-dom";

import type { AuthUser } from "@/components/layout/app-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardPage() {
  const user = useOutletContext<AuthUser>();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Executive KPIs from gold marts (GMV, orders, AOV, refunds).
        </p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>
            Authenticated with an httpOnly JWT cookie.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Email:</span> {user.email}
          </p>
          {user.name && (
            <p>
              <span className="text-muted-foreground">Name:</span> {user.name}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
