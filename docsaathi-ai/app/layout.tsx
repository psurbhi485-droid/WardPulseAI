import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocSaathi AI – Understand Documents. Know What to Do Next.",
  description:
    "Pan-India AI-powered document understanding assistant. Upload PDFs, images, or capture documents and receive easy-to-understand explanations in your preferred language.",
  keywords: ["document assistant", "AI", "India", "multilingual", "PDF understanding"],
  openGraph: {
    title: "DocSaathi AI",
    description: "Your documents, simplified.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-peach-gradient antialiased">
        {children}
      </body>
    </html>
  );
}
