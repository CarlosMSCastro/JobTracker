import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { ProfileProvider } from "@/components/ProfileProvider";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Job Tracker",
  description: "Agregador pessoal de vagas de emprego",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt" className={`${jetbrainsMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <ProfileProvider>
          <NavBar />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
        </ProfileProvider>
      </body>
    </html>
  );
}
