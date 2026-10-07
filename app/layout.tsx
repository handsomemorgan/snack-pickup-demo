import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "取餐有约 小吃预约自取演示",
  description: "校园小吃预约、商户商品管理与服务授权演示",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
