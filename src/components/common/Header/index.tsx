"use client";
import { useEffect, useState } from "react";

type PageProps = {
  pageName: string;
};

export function Header(props: PageProps) {
  const [pageName, setPageName] = useState<string>(props.pageName);
  useEffect(() => {
    setPageName(props.pageName);
  }, [props]);

  return (
    <div className="ps-3">
      WebGL&nbsp;School&nbsp;-&nbsp;
      <span className="font-bold">{pageName}</span>
    </div>
  );
}
