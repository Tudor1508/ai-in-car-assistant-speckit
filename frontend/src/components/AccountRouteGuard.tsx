"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Box } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/lib/store";
import { accountLoaded } from "@/features/auth/authSlice";
import { readCurrentAccount } from "@/features/auth/authApi";

export function AccountRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const account = useSelector((state: RootState) => state.auth.account);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;
    const evaluate = (role: string) => {
      if (!active) return;
      if (role === "producer") {
        router.replace(pathname === "/profile" ? "/producer/profile" : "/producer");
        return;
      }
      setAllowed(true);
    };
    if (account) {
      evaluate(account.role);
    } else {
      readCurrentAccount().then((current) => {
        if (!active) return;
        dispatch(accountLoaded(current));
        evaluate(current.role);
      }).catch(() => {
        if (active) router.replace("/login");
      });
    }
    return () => { active = false; };
  }, [account, dispatch, pathname, router]);

  if (!allowed) {
    return <Box role="status" sx={{ minHeight: "60vh", display: "grid", placeItems: "center", color: "text.secondary" }}>Checking account access…</Box>;
  }
  return children;
}
