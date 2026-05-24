import type { Metadata } from "next";
import { Architects_Daughter, Geist_Mono, Manrope, Noto_Serif } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { ColorSchemeProvider } from "@/components/color-scheme-provider";
import { NavigationProgress } from "@/components/navigation-progress";

const notoSerif = Noto_Serif({
  variable: "--font-heading",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const architectsDaughter = Architects_Daughter({
  variable: "--font-sketchy",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shelfgram | Social Reading Platform",
  description:
    "Shelfgram helps readers track books, write reviews, build reading profiles, and connect through physical book collections.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        manrope.variable,
        notoSerif.variable,
        geistMono.variable,
        architectsDaughter.variable,
        "font-sans",
      )}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          defaultTheme="system"
        >
          <ColorSchemeProvider>
            <Suspense>
              <NavigationProgress />
            </Suspense>
            {children}
            <Toaster richColors />
          </ColorSchemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
