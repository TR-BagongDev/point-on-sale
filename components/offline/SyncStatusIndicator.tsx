import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const syncStatusVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      status: {
        online:
          "border-transparent bg-green-500 text-white shadow hover:bg-green-600",
        offline:
          "border-transparent bg-gray-500 text-white shadow hover:bg-gray-600",
        syncing:
          "border-transparent bg-blue-500 text-white shadow hover:bg-blue-600",
        pending:
          "border-transparent bg-yellow-500 text-white shadow hover:bg-yellow-600",
        synced:
          "border-transparent bg-green-500 text-white shadow hover:bg-green-600",
        conflict:
          "border-transparent bg-red-500 text-white shadow hover:bg-red-600",
        failed:
          "border-transparent bg-red-500 text-white shadow hover:bg-red-600",
      },
    },
    defaultVariants: {
      status: "online",
    },
  }
)

export interface SyncStatusIndicatorProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof syncStatusVariants> {
  status: "online" | "offline" | "syncing" | "pending" | "synced" | "conflict" | "failed"
}

function SyncStatusIndicator({
  className,
  status,
  ...props
}: SyncStatusIndicatorProps) {
  return (
    <div
      className={cn(syncStatusVariants({ status }), className)}
      {...props}
    />
  )
}

export { SyncStatusIndicator, syncStatusVariants }
