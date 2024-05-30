import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <>
      <div className="font-bold pe-3">By bKiyoh</div>
      <a
        className="flex items-center"
        href="https://x.com/bKiyoh"
        target="_blank"
      >
        <Image src="/x_logo.svg" alt="x Logo" width={13} height={24} />
      </a>
    </>
  );
}
