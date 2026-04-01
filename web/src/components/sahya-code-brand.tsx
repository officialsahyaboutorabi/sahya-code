import { sahyaCodeVersion } from "@/lib/version";
import { cn } from "@/lib/utils";

type SahyaCodeBrandProps = {
  className?: string;
  size?: "sm" | "md";
  showVersion?: boolean;
};

export function SahyaCodeBrand({
  className,
  size = "md",
  showVersion = true,
}: SahyaCodeBrandProps) {
  const textSizeClass = size === "sm" ? "text-base" : "text-lg";
  const versionPadding = size === "sm" ? "text-xs" : "text-sm";
  const logoSize = size === "sm" ? "size-6" : "size-7";
  const logoPx = size === "sm" ? 24 : 28;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <a
        href="https://github.com/sahyaboutorabi/sahya-code"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <img
          src="/logo.png"
          alt="Sahya"
          width={logoPx}
          height={logoPx}
          className={logoSize}
        />
        <span className={cn(textSizeClass, "font-semibold text-foreground")}>
          Sahya Code
        </span>
      </a>
      {showVersion && (
        <span
          className={cn("text-muted-foreground font-medium", versionPadding)}
        >
          v{sahyaCodeVersion}
        </span>
      )}
    </div>
  );
}

// Legacy alias for backward compatibility
export const KimiCliBrand = SahyaCodeBrand;
