import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import Link from "next/link";

export const metadata: Metadata = {
  title: "Job Tracker",
  description: "Agregador pessoal de vagas de emprego",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-100">
        <header className="border-b border-neutral-800 bg-neutral-900/60 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3 text-sm">
            <span className="font-semibold tracking-tight text-neutral-100">Job Tracker</span>
            <Link href="/" className="text-neutral-400 transition-colors hover:text-neutral-100">
              Vagas
            </Link>
            <Link href="/candidaturas" className="text-neutral-400 transition-colors hover:text-neutral-100">
              Candidaturas
            </Link>
            <Link href="/fontes" className="text-neutral-400 transition-colors hover:text-neutral-100">
              Fontes
            </Link>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
