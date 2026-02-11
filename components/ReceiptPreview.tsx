"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  generateReceiptHTML,
  type ReceiptTemplate,
  type StoreSettings,
} from "@/lib/receipt";

export interface ReceiptPreviewProps extends React.HTMLAttributes<HTMLDivElement> {
  template?: Partial<ReceiptTemplate>;
  settings?: Partial<StoreSettings>;
}

// Sample order for preview
const sampleOrder = {
  orderNumber: "ORD-001",
  user: {
    name: "Admin",
  },
  items: [
    {
      menu: {
        name: "Nasi Goreng Spesial",
      },
      quantity: 2,
      price: 25000,
      notes: null,
    },
    {
      menu: {
        name: "Es Teh Manis",
      },
      quantity: 2,
      price: 5000,
      notes: null,
    },
  ],
  subtotal: 60000,
  tax: 6000,
  discount: 0,
  total: 66000,
  paymentMethod: "CASH",
  createdAt: new Date(),
};

const ReceiptPreview = React.forwardRef<HTMLDivElement, ReceiptPreviewProps>(
  ({ template, settings, className, ...props }, ref) => {
    const iframeRef = React.useRef<HTMLIFrameElement>(null);

    // Generate receipt HTML
    const receiptHTML = React.useMemo(() => {
      return generateReceiptHTML({
        order: sampleOrder,
        template,
        settings,
      });
    }, [template, settings]);

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
          title="Receipt Preview"
          sandbox="allow-same-origin"
        />
      </div>
    );
  }
);

ReceiptPreview.displayName = "ReceiptPreview";

export { ReceiptPreview };
