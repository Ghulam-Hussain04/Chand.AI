import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Dr. Terra - Soil Analysis",
  description: "Dr. Terra Chatbot Prototype",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ height: "100%" }}>
      <body className={inter.className} style={{ height: "100%", margin: 0 }}>
        <main
          style={{
            height: "100%",
            width: "100%",
          }}
        >
          {children}
        </main>
      </body>
    </html>
  );
}
