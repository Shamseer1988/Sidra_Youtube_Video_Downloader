import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/providers/pwa-register";

export const metadata: Metadata = {
  title: {
    default: "Sidra Media",
    template: "%s · Sidra Media",
  },
  description:
    "Self-hosted media hub — download videos & music from the web and stream your NAS library.",
  applicationName: "Sidra Media",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sidra Media",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0d13",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased min-h-screen" suppressHydrationWarning>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
