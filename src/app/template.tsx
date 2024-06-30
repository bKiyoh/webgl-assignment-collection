"use client";

import { useState, useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { usePathname } from "next/navigation";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { NavigationMenu } from "@/components/common/NavigationMenu";
import { LINK_DATA } from "@/constants/linkData";
import { Progress } from "@/components/ui/progress";

export default function Template({ children }: { children: React.ReactNode }) {
  const currentUrl = usePathname();
  const currentPage = LINK_DATA.find((item) => item.root === currentUrl);
  const [pageName, setPageName] = useState<string>(currentPage?.name || "");
  const [isAction, setIsAction] = useState<boolean>(
    currentPage?.pressShiftKey || false
  );
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    const duration = 1000; // 2秒で100にする
    const increment = 100 / (duration / 1000); // 毎秒の増加量
    const interval = 100; // 0.1秒ごとに更新

    let currentProgress = 0;
    const timer = setInterval(() => {
      currentProgress += increment * (interval / 1000);
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(timer);
      }
      setProgress(currentProgress);
    }, interval);
    return () => clearInterval(timer);
  }, []);

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
        <div
          className="flex justify-center"
          style={{ display: progress >= 100 ? "none" : "flex" }}
        >
          <div className="w-[60%]">
            <Progress value={progress} />
          </div>
        </div>
        <div
          className="w-full flex justify-center"
          style={{ display: progress >= 100 ? "flex" : "none" }}
        >
          {children}
        </div>
        <div className="flex justify-end">
          <Footer />
        </div>
      </main>
    </ThemeProvider>
  );
}
