import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({
  compact = false,
  className,
  priority = false,
}: {
  compact?: boolean;
  className?: string;
  priority?: boolean;
}) {
  if (!compact) {
    return (
      <Image
        src="/tecantei-logodourada.jpg"
        alt="Te Cantei"
        width={180}
        height={180}
        priority={priority}
        className={cn("h-auto w-24 rounded-xl object-contain shadow-[0_10px_35px_rgba(212,175,85,.14)]", className)}
      />
    );
  }

  return (
    <span className={cn("tc-logo-mark relative block size-12 shrink-0 overflow-hidden rounded-2xl border border-[#F0BD4F]/45 bg-black shadow-[0_8px_28px_rgba(240,189,79,.28)]", className)}>
      <Image
        src="/tecantei-logodourada.jpg"
        alt=""
        aria-hidden="true"
        width={84}
        height={84}
        priority={priority}
        className="absolute -left-[18px] -top-[7px] h-[84px] w-[84px] max-w-none object-contain"
      />
    </span>
  );
}
