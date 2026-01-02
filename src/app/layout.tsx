import type { Metadata } from "next";
import "./globals.scss";

export const metadata: Metadata = {
  title: "CallInsight - AI Call Analytics",
  description: "AI-powered call analysis and insights platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
