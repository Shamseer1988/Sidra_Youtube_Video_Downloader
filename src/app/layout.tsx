import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sidra Media",
  description:
    "Self-hosted media hub — download videos & audio from the web and stream your NAS library, Jellyfin-style.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className="font-sans antialiased bg-navy-900 text-slate-200 min-h-screen"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
