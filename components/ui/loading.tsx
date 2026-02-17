import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const loadingVariants = cva(
  "animate-spin rounded-full border-2 border-current border-t-transparent",
  {
    variants: {
      size: {
        default: "size-4",
        sm: "size-3",
        lg: "size-6",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

export interface LoadingProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof loadingVariants> {}

const Loading = React.forwardRef<HTMLDivElement, LoadingProps>(
  ({ className, size, ...props }, ref) => {
    return (
      <div
        className={cn(loadingVariants({ size, className }))}
        ref={ref}
        role="status"
        aria-label="Loading"
        {...props}
      />
    )
  }
)
Loading.displayName = "Loading"

export { Loading, loadingVariants }
