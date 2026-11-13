import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import { EnregistrerServiceWorker } from "@/components/Divers";
import "./globals.css";

const sg = Space_Grotesk({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700"], variable: "--font-sg", display: "swap" });

export const metadata: Metadata = {
  title: { default: "ArtizaPro", template: "%s · ArtizaPro" },
  description: "Secrétaire commerciale de poche pour artisans du bâtiment.",
  applicationName: "ArtizaPro",
  appleWebApp: { capable: true, title: "ArtizaPro", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F2F3F5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={sg.variable}>
      <body>
        {children}
        <EnregistrerServiceWorker />
      </body>
    </html>
  );
}
