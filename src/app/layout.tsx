import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { BRAND_LOGO_URL } from "@/lib/brand";

/* Inter is the open-source substitute for Airbnb Cereal (see DESIGN.md) */
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kreuger Ops Console",
  description: "Manufacturing operations dashboard",
  icons: {
    icon: BRAND_LOGO_URL,
    apple: BRAND_LOGO_URL,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
