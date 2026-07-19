import type { LucideIcon } from "lucide-react";
import {
  ChartColumn,
  Funnel,
  LayoutDashboard,
  Package,
  Settings2,
  Users,
  Warehouse,
} from "lucide-react";

export type SidebarItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
};

export type SidebarGroup = {
  title: string;
  items: SidebarItem[];
};

export const sidebarConfig: SidebarGroup[] = [
  {
    title: "Analytics",
    items: [
      {
        title: "Overview",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Products",
        href: "/analytics/products",
        icon: Package,
      },
      {
        title: "Customers",
        href: "/analytics/customers",
        icon: Users,
      },
      {
        title: "Funnel",
        href: "/analytics/funnel",
        icon: Funnel,
      },
      {
        title: "Operations",
        href: "/analytics/operations",
        icon: Warehouse,
      },
    ],
  },
  {
    title: "Pipeline",
    items: [
      {
        title: "dbt Layers",
        href: "/pipeline/dbt",
        icon: ChartColumn,
        disabled: true,
      },
      {
        title: "Settings",
        href: "/settings",
        icon: Settings2,
        disabled: true,
      },
    ],
  },
];
