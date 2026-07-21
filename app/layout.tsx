import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { MotionEffects } from "@/components/motion-effects";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const viewport: Viewport = {
  themeColor: "#f6f7fb",
};

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = forwardedHost?.split(",")[0]?.trim() || requestHeaders.get("host") || "localhost:3000";
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol === "http" || host.startsWith("localhost") ? "http" : "https";
  let metadataBase: URL;

  try {
    metadataBase = new URL(`${protocol}://${host}`);
  } catch {
    metadataBase = new URL("http://localhost:3000");
  }

  const title = "NotZero | Connect your education to current practice";
  const description = "See how what you studied and built connects to current practice in your field, then find the smallest useful next step.";
  const socialImage = new URL("/og.png", metadataBase).toString();

  return {
    metadataBase,
    title: { default: title, template: "%s | NotZero" },
    description,
    icons: {
      icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
      apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    },
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: socialImage, width: 1200, height: 630, alt: "NotZero. You are not starting from zero." }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* Arms scroll reveals before first paint. Skipped on hash loads so
            anchored content is never hidden while the page hydrates. */}
        <script
          dangerouslySetInnerHTML={{
            __html: "if(!location.hash)document.documentElement.classList.add('js-motion');",
          }}
        />
        <MotionEffects />
        <a className="skip-link" href="#main-content">Skip to content</a>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
