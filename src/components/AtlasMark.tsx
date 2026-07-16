import Image from "next/image";

export function AtlasMark({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/atlas-mark.png"
      alt="Intera Atlas"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      priority
    />
  );
}
