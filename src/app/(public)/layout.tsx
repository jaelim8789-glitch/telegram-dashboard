import type { Metadata } from "next";
import { PublicLayoutClient } from "./PublicLayoutClient";

export const metadata: Metadata = {
  title: {
    default: "TeleMon | Telegram operations workspace",
    template: "%s | TeleMon",
  },
  description:
    "TeleMon is a Telegram operations platform for managing accounts, broadcasts, groups, automation, scheduling, failure recovery, and delivery analytics.",
  keywords: [
    "TeleMon",
    "Telegram operations",
    "broadcast scheduling",
    "group discovery",
    "auto reply",
    "reply macro",
    "failure recovery",
    "delivery analytics",
  ],
  openGraph: {
    title: "TeleMon | Telegram operations workspace",
    description:
      "Manage Telegram accounts, broadcasts, groups, automation, scheduling, recovery, and analytics in one operational workspace.",
    siteName: "TeleMon",
    type: "website",
    locale: "en_US",
  },
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicLayoutClient>{children}</PublicLayoutClient>;
}
