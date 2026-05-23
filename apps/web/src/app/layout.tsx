import type { Metadata } from "next";
import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PostHogProvider } from "@/components/providers/posthog-provider";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Leash";

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — Spend governance for AI agents`,
    template: `%s | ${APP_NAME}`,
  },
  description:
    "Give your AI agents money. Keep them on a leash. Non-custodial spend-governance — budget caps, scoped credentials, audit trails, kill-switch. Bitcoin Lightning + stablecoin, multi-rail.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${plexSans.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <PostHogProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
            <TooltipProvider>
              {children}
            </TooltipProvider>
          </ThemeProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
