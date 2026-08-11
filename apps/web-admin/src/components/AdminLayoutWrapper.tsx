"use client";

import React from "react";
import { usePathname } from "next/navigation";
import AdminSidebar from "./AdminSidebar";

export default function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-white w-full flex flex-col">
        {children}
      </div>
    );
  }

  return (
    <>
      <AdminSidebar />
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen w-full min-w-0">
        {children}
      </div>
    </>
  );
}
