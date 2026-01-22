import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import GlobalProvider from "@/context/GlobalProvider";
import NotificationProvider from "@/context/NotificationProvider";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "MindSafe - Parental Control Dashboard",
  description: "Keep your family safe with MindSafe monitoring solution",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className={`${poppins.className} antialiased`}>
        <GlobalProvider>
          <NotificationProvider>
            <div className="min-h-screen bg-pattern">
              {children}
            </div>
          </NotificationProvider>
        </GlobalProvider>
      </body>
    </html>
  );
}
