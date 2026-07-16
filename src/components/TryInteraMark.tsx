import Image from "next/image";

export function TryInteraMark({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--line)] bg-white ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/tryintera-mark-v2.png"
        alt="TryIntera"
        width={size}
        height={size}
        className="h-[82%] w-[82%] object-contain"
        unoptimized
      />
    </span>
  );
}
