"use client";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import Link from "next/link";

export function NavigationMenu() {
  const renderSheetCloseButton = (href: string, buttonText: string) => (
    <SheetClose asChild>
      <Link href={href} className="text-muted-foreground hover:text-foreground">
        {buttonText}
      </Link>
    </SheetClose>
  );

  return (
    <Sheet>
      <SheetTrigger>
        <Menu />
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>WebGL School</SheetTitle>
          {renderSheetCloseButton("/", "TOP")}
          {renderSheetCloseButton("/vol1", "Vol.1 2024/05/11")}
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}
