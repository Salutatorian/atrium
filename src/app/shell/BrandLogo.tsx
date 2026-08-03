import atriumLogo from "../../assets/atrium-logo.png";
import { APP_NAME } from "../brand";
import { cn } from "../../utils/cn";

type BrandLogoProps = {
  className?: string;
  /** Visual size hint — keep aria-label on the parent control when clickable. */
  size?: "sm" | "md" | "lg";
  decorative?: boolean;
};

const SIZE_CLASS: Record<NonNullable<BrandLogoProps["size"]>, string> = {
  sm: "brand-logo--sm",
  md: "brand-logo--md",
  lg: "brand-logo--lg",
};

/** Transparent Atrium mark — use wherever the product name was shown as chrome. */
export function BrandLogo({
  className,
  size = "md",
  decorative = true,
}: BrandLogoProps) {
  return (
    <img
      className={cn("brand-logo", SIZE_CLASS[size], className)}
      src={atriumLogo}
      alt={decorative ? "" : APP_NAME}
      draggable={false}
      decoding="async"
    />
  );
}
