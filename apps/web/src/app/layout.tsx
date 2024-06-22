import "~/styles/globals.css";

import { Manrope } from "next/font/google";

import { ThemeProvider } from "~/components/theme/ThemeProvider";
import { Toaster } from "~/components/ui/sonner";
import { TRPCReactProvider } from "~/trpc/react";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata = {
  title: "convect.xyz",
  description: "Serverless infrastructure for the EVM",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${manrope.className} h-full`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          disableTransitionOnChange
        >
          <Toaster />
          <TRPCReactProvider>{children}</TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
