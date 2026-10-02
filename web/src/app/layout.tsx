import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ISR Shop",
  description: "Learning Incremental Static Regeneration with 50,000 products",
};

// System fonts: next/font/google downloads fonts at build time, which would
// make Docker builds depend on internet access.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
