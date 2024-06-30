"use client";
import { useEffect, useState } from "react";

type PageProps = {
  pageName: string;
  isAction: boolean;
};

export function Header(props: PageProps) {
  const [pageName, setPageName] = useState<string>(props.pageName);
  const [isAction, setIsAction] = useState<boolean>(props.isAction);
  useEffect(() => {
    setPageName(props.pageName);
    setIsAction(props.isAction);
  }, [props]);

  return (
    <div className="ps-3">
      WebGL&nbsp;Assignment&nbsp;Collection&nbsp;-&nbsp;
      <span className="font-bold">{pageName}&nbsp;</span>
      {isAction && <span className="text-lg">Press&nbsp;Shift&nbsp;Key</span>}
    </div>
  );
}
