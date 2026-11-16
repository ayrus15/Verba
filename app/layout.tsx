import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Verba — Find your words. Find your voice.",
  description: "A voice-first English vocabulary tutor."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
