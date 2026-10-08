import type { ReactNode } from "react";
import { AppNavigation } from "@/components/AppNavigation";
import { AccountRouteGuard } from "@/components/AccountRouteGuard";

export default function AccountLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <AccountRouteGuard><AppNavigation />{children}</AccountRouteGuard>;
}
