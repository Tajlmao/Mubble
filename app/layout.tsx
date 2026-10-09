import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "cesium/Build/Cesium/Widgets/widgets.css";
import "./globals.css";
const brandMetadata: Metadata = {
  title: "Mubble — Weather & Earth",
  description:
    "A closer look at our planet. Explore Earth, satellite observations, weather forecasts, and tropical cyclone advisories with Mubble.",
  applicationName: "Mubble",
  appleWebApp: {
    title: "Mubble",
    capable: true,
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "Mubble — Weather & Earth",
    description: "A closer look at our planet.",
    siteName: "Mubble",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mubble — Weather & Earth",
    description: "A closer look at our planet.",
  },
  robots: { index: true, follow: true },
};
export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host")?.split(",")[0].trim() ||
    requestHeaders.get("host") ||
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto")?.split(",")[0].trim() === "https"
      ? "https"
      : "http";
  return {
    ...brandMetadata,
    metadataBase: new URL(
      process.env.MUBBLE_SITE_URL || `${protocol}://${host}`,
    ),
  };
}
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b151b",
  viewportFit: "cover",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
