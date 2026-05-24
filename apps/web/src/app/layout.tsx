import type { Metadata } from "next";
import { Karla, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PostHogProvider } from "@/components/providers/posthog-provider";

const karla = Karla({
  variable: "--font-karla",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "leashd";

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME}: Spend governance for AI agents`,
    template: `%s | ${APP_NAME}`,
  },
  description:
    "Give your AI agents money. Keep them on a leash. Non-custodial spend governance: budget caps, scoped credentials, audit trails, kill-switch. Bitcoin Lightning and stablecoin, multi-rail.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${karla.variable} ${plexMono.variable} font-sans antialiased`}>
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
