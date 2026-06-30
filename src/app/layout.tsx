import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { QueryProvider } from "@/providers/query-provider"
import { AuthProvider } from "@/providers/auth-provider"
import { ServiceWorkerRegistration } from "@/components/shared/sw-registration"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#059669",
}

export const metadata: Metadata = {
  title: "CS Department Management System",
  description: "Comprehensive management system for the Computer Science Department — students, faculty, courses, timetable, attendance, results, and more.",
  keywords: ["CS Department", "University", "Management System", "Education"],
  authors: [{ name: "CS Department" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CS Dept",
  },
  openGraph: {
    title: "CS Department Management System",
    description: "Comprehensive management system for the Computer Science Department",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <QueryProvider>
          <AuthProvider>
            {children}
            <Toaster position="top-right" richColors closeButton />
            <ServiceWorkerRegistration />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}