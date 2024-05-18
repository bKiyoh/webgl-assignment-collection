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
  const currentPage = LINK_DATA.find((item) => item.root === currentUrl);
  const [pageName, setPageName] = useState<string>(currentPage?.name || "");
  const [isAction, setIsAction] = useState<boolean>(
    currentPage?.pressShiftKey || false
  );
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <main className="flex min-h-screen flex-col justify-between p-6 font-mono">
        <div className="flex justify-start">
          <NavigationMenu pageName={pageName} onChange={setPageName} />
          <div className="invisible md:visible">
            <Header pageName={pageName} isAction={isAction} />
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
