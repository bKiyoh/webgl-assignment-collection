"use client";
import Link from "next/link";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LINK_DATA } from "@/constants/linkData";
import { Menu } from "lucide-react";

type PageProps = {
  pageName: string;
  onChange: (newValue: string) => void;
};

export function NavigationMenu(props: PageProps) {
  const handleClick = (newValue: string) => {
    props.onChange(newValue);
  };

  const renderSheetCloseButton = (href: string, pageName: string) => (
    <SheetClose asChild key={href}>
      <Link
        href={href}
        className="text-muted-foreground hover:text-foreground"
        onClick={() => handleClick(pageName)}
      >
        {pageName}
      </Link>
    </SheetClose>
  );

  const menu = LINK_DATA.map((link) =>
    renderSheetCloseButton(link.root, link.name)
  );

  return (
    <Sheet>
      <SheetTrigger>
        <Menu />
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>WebGL School</SheetTitle>
          {menu}
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}
