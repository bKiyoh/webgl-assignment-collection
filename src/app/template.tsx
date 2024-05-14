"use client";

import { useState } from "react";
import { ThemeProvider } from "next-themes";
import { usePathname } from "next/navigation";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { NavigationMenu } from "@/components/common/NavigationMenu";
import { LINK_DATA } from "@/constants/linkData";

export default function Template({ children }: { children: React.ReactNode }) {
  const currentUrl = usePathname();
  const initPageName = LINK_DATA.find((item) => item.root === currentUrl)?.name;
  const [pageName, setPageName] = useState<string>(initPageName || "");
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <main className="flex min-h-screen flex-col justify-between p-6 font-mono">
        <div className="flex justify-start">
          <NavigationMenu pageName={pageName} onChange={setPageName} />
          <div className="invisible md:visible">
            <Header pageName={pageName} />
          </div>
        </div>
        <div className="w-full flex justify-center">{children}</div>
        <div className="flex justify-end">
          <Footer />
        </div>
      </main>
    </ThemeProvider>
  );
}
