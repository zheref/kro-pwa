import "./globals.css";
import type { Metadata } from "next";
import { FaUser } from "react-icons/fa";
import { HStack } from "@chakra-ui/react";
import { IconButton } from "@chakra-ui/react";
import { Toaster } from "@/components/ui/toaster";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProviders } from "@/components/ui/app-providers";
import { ColorModeButton } from "@/components/ui/color-mode";
import { NavigationLayout } from "@/components/ui/navigation-layout";
import { getAuthSession } from '@/auth'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kro for Web",
  description: "by Zheref",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
    const session = await getAuthSession()

    const actionBar = (
        <HStack>
          <ColorModeButton variant="subtle" size="xs" />
          <IconButton aria-label="Settings" size="xs" variant="subtle" >
            <FaUser />
          </IconButton>
        </HStack>
    )

    return (
        <html lang="en" suppressHydrationWarning>
          <body className={`${geistSans.variable} ${geistMono.variable}`}>
            <AppProviders session={session}>
              <NavigationLayout title="Kro" actionBar={actionBar}>
                {children}
              </NavigationLayout>
              <Toaster />
            </AppProviders>
          </body>
        </html>
    )
}
