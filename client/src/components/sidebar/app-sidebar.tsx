import { NavLink } from "react-router-dom";

import { sidebarConfig } from "@/config/sidebar-config";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight">
            dbt Analytics
          </span>
          <span className="text-xs text-muted-foreground">Ecommerce pipeline</span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto p-3">
        {sidebarConfig.map((group) => (
          <div key={group.title} className="flex flex-col gap-1">
            <p className="px-2 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {group.title}
            </p>

            {group.items.map((item) => {
              const Icon = item.icon;

              if (item.disabled) {
                return (
                  <div
                    key={item.href}
                    className="flex cursor-not-allowed items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground/60"
                    title="Coming soon"
                  >
                    <Icon className="size-4 shrink-0" />
                    <span>{item.title}</span>
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/70",
                    )
                  }
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{item.title}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
