"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const shiftStatusVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      status: {
        open:
          "border-transparent bg-green-500 text-white shadow hover:bg-green-600",
        closed:
          "border-transparent bg-gray-500 text-white shadow hover:bg-gray-600",
        none:
          "border-transparent bg-yellow-500 text-white shadow hover:bg-yellow-600",
      },
    },
    defaultVariants: {
      status: "none",
    },
  }
);

export interface ShiftStatusIndicatorProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof shiftStatusVariants> {
  status: "open" | "closed" | "none";
  shiftName?: string;
}

function ShiftStatusIndicator({
  className,
  status,
  shiftName,
  ...props
}: ShiftStatusIndicatorProps) {
  const displayText = React.useMemo(() => {
    if (status === "open" && shiftName) {
      return shiftName;
    }
    if (status === "open") {
      return "Shift Open";
    }
    if (status === "closed") {
      return "Shift Closed";
    }
    return "No Active Shift";
  }, [status, shiftName]);

  return (
    <div
      className={cn(shiftStatusVariants({ status }), className)}
      {...props}
    >
      {displayText}
    </div>
  );
}

export { ShiftStatusIndicator, shiftStatusVariants };
