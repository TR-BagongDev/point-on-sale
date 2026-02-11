"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  generateReceiptHTML,
  type Order,
  type ReceiptTemplate,
  type StoreSettings,
  type ReceiptOptions,
} from "@/lib/receipt";

export interface ReceiptProps extends React.HTMLAttributes<HTMLDivElement> {
  order: Order;
  template?: Partial<ReceiptTemplate>;
  settings?: Partial<StoreSettings>;
}

const Receipt = React.forwardRef<HTMLDivElement, ReceiptProps>(
  ({ order, template, settings, className, ...props }, ref) => {
    const iframeRef = React.useRef<HTMLIFrameElement>(null);

    // Generate receipt HTML
    const receiptHTML = React.useMemo(() => {
      const options: ReceiptOptions = {
        order,
        template,
        settings,
      };
      return generateReceiptHTML(options);
    }, [order, template, settings]);

    // Update iframe content when HTML changes
    React.useEffect(() => {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(receiptHTML);
        doc.close();
      }
    }, [receiptHTML]);

    return (
      <div
        ref={ref}
        className={cn("w-full", className)}
        {...props}
      >
        <iframe
          ref={iframeRef}
          className="w-full border-0"
          style={{
            height: template?.paperWidth === 58 ? '400px' : '500px',
            minHeight: '300px',
          }}
          title={`Receipt - ${order.orderNumber}`}
          sandbox="allow-same-origin"
        />
      </div>
    );
  }
);

Receipt.displayName = "Receipt";

export { Receipt };
