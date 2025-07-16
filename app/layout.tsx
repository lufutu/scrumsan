import type { Metadata } from "next";
import { DM_Sans, Lora, IBM_Plex_Mono } from "next/font/google";
import "@/app/globals.css";
import { Toaster } from "@/components/ui/sonner";
import SupabaseProvider from "@/providers/supabase-provider";
import { OrganizationProvider } from "@/providers/organization-provider";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({ 
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ScrumSan - Agile Project Management",
  description: "A modern agile project management tool for teams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${lora.variable} ${ibmPlexMono.variable} antialiased`}
      >
        <SupabaseProvider>
          <OrganizationProvider>
            {children}
            <Toaster />
          </OrganizationProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
