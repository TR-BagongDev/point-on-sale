import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      status: {
        PENDING:
          "border-transparent bg-yellow-500 text-white shadow hover:bg-yellow-600",
        PREPARING:
          "border-transparent bg-blue-500 text-white shadow hover:bg-blue-600",
        READY:
          "border-transparent bg-green-500 text-white shadow hover:bg-green-600",
        COMPLETED:
          "border-transparent bg-slate-500 text-white shadow hover:bg-slate-600",
      },
    },
    defaultVariants: {
      status: "PENDING",
    },
  }
)

export interface OrderStatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusBadgeVariants> {
  status: "PENDING" | "PREPARING" | "READY" | "COMPLETED"
}

function OrderStatusBadge({
  className,
  status,
  ...props
}: OrderStatusBadgeProps) {
  return (
    <div
      className={cn(statusBadgeVariants({ status }), className)}
      {...props}
    />
  )
}

export { OrderStatusBadge, statusBadgeVariants }
