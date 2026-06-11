import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LiffProvider } from "@/components/LiffProvider";
import { Toaster } from "@/components/ui/sonner";
import AppNav from "@/components/AppNav";
import InitialLoader from "@/components/InitialLoader";
import { isLineInAppBrowser } from "@/lib/user-agent";
import { cn } from "@/lib/utils";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JJSquash 打球登記",
  description: "球隊打球登記系統",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const isLiffClient = isLineInAppBrowser(headersList.get("user-agent"));

  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function applyTheme() {
                  try {
                    var theme = localStorage.getItem('jjsquash-theme');
                    var dark = theme === 'dark' || (theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                    document.documentElement.classList.remove('dark', 'light');
                    document.documentElement.classList.add(dark ? 'dark' : 'light');
                  } catch(e) {
                    document.documentElement.classList.add('light');
                  }
                }
                applyTheme();
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
              })();
            `,
          }}
        />
      </head>
      <body
        className={cn(
          geistSans.variable,
          geistMono.variable,
          "antialiased",
          isLiffClient && "pb-[calc(4.5rem+env(safe-area-inset-bottom))]"
        )}
      >
        <ThemeProvider>
          <LiffProvider>
            <InitialLoader>
              <AppNav />
              {children}
            </InitialLoader>
            <Toaster
              richColors
              position="top-center"
              offset="env(safe-area-inset-top, 0px)"
            />
          </LiffProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
