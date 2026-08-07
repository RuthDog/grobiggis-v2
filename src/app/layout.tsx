import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { BRAND } from "@/config/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: "GroBiggis V2",
  description: BRAND.description,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="sv">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
