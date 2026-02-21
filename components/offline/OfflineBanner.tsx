import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { useOfflineStore } from "@/store/offline-store"

const offlineBannerVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        offline:
          "border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:border-yellow-500 [&>svg]:text-yellow-700 dark:text-yellow-400",
      },
    },
    defaultVariants: {
      variant: "offline",
    },
  }
)

export interface OfflineBannerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof offlineBannerVariants> {
  message?: string
}

const OfflineBanner = React.forwardRef<
  HTMLDivElement,
  OfflineBannerProps
>(({ className, variant, message = "You are currently offline. Orders will be saved locally and synced when you reconnect.", ...props }, ref) => {
  const isOnline = useOfflineStore((state) => state.isOnline)

  // Don't render if online
  if (isOnline) {
    return null
  }

  return (
    <div
      ref={ref}
      role="alert"
      className={cn(offlineBannerVariants({ variant }), className)}
      {...props}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M1 1l22 22" />
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
        <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
        <line x1="12" y1="20" x2="12.01" y2="20" />
      </svg>
      <div className="pl-7">
        <h5 className="mb-1 font-medium leading-none tracking-tight">
          Offline Mode
        </h5>
        <div className="text-sm [&_p]:leading-relaxed">
          <p>{message}</p>
        </div>
      </div>
    </div>
  )
})
OfflineBanner.displayName = "OfflineBanner"

export { OfflineBanner, offlineBannerVariants }
