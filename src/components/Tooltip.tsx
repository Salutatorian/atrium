import * as RadixTooltip from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";

type TooltipProps = {
  label: string;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
};

export function Tooltip({ label, children, side = "right" }: TooltipProps) {
  return (
    <RadixTooltip.Root delayDuration={250}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={8}
          className="tooltip-content"
        >
          {label}
          <RadixTooltip.Arrow className="tooltip-arrow" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
