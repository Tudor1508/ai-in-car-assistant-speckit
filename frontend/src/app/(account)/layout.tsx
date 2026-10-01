import type { ReactNode } from "react";
import { AppNavigation } from "@/components/AppNavigation";

export default function AccountLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <><AppNavigation />{children}</>;
}
