import Image from "next/image";

export function TrialPathMark({
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
        src="/trialpath-mark-v2.png"
        alt="TrialPath"
        width={size}
        height={size}
        className="h-[82%] w-[82%] object-contain"
        unoptimized
      />
    </span>
  );
}
