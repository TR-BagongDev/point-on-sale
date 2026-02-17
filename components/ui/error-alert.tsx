import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { AlertCircle, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const errorAlertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive",
      },
    },
    defaultVariants: {
      variant: "destructive",
    },
  }
)

export interface ErrorAlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof errorAlertVariants> {
  title?: string
  message: string
  retryLabel?: string
  onRetry?: () => void
  isRetrying?: boolean
}

const ErrorAlert = React.forwardRef<HTMLDivElement, ErrorAlertProps>(
  (
    {
      className,
      variant,
      title,
      message,
      retryLabel,
      onRetry,
      isRetrying = false,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(errorAlertVariants({ variant }), className)}
        {...props}
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="size-5 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            {title && (
              <h5 className="font-medium leading-none tracking-tight">
                {title}
              </h5>
            )}
            <p className="text-sm leading-relaxed [&_p]:leading-relaxed">
              {message}
            </p>
            {onRetry && (
              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  disabled={isRetrying}
                  className="gap-1.5"
                >
                  <RefreshCw
                    className={cn(
                      "size-3.5",
                      isRetrying && "animate-spin"
                    )}
                  />
                  {retryLabel || "Coba Lagi"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }
)
ErrorAlert.displayName = "ErrorAlert"

export { ErrorAlert, errorAlertVariants }
