import { DM_Sans, Lora, IBM_Plex_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import '../globals.css'

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

export default function InviteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${lora.variable} ${ibmPlexMono.variable} antialiased`}>
        {children}
        <Toaster richColors />
      </body>
    </html>
  )
}