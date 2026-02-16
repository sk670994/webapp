import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/nav-bar";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Posts Studio",
  description: "Next.js frontend for JWT Posts app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${manrope.variable}`}>
        <div className="bg-orbs" aria-hidden="true" />
        <NavBar />
        <main className="mx-auto w-[min(1024px,92%)] py-8">{children}</main>
      </body>
    </html>
  );
}
