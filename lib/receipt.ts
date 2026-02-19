export interface OrderItem {
  menu: {
    name: string;
  };
  quantity: number;
  price: number;
  notes?: string | null;
}

export interface Order {
  orderNumber: string;
  user: {
    name: string;
  } | null;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  createdAt: Date;
}

export interface ReceiptTemplate {
  header?: string | null;
  footer?: string | null;
  showDate: boolean;
  showTime: boolean;
  showCashier: boolean;
  showTax: boolean;
  paperWidth: number;
}

export interface StoreSettings {
  storeName: string;
  address?: string | null;
  phone?: string | null;
  taxRate?: number;
  currency?: string;
}

import { formatCurrency } from "./utils";

export interface ReceiptOptions {
  order: Order;
  template?: Partial<ReceiptTemplate>;
  settings?: Partial<StoreSettings>;
}

/**
 * Generate receipt HTML for thermal printer
 */
export function generateReceiptHTML(options: ReceiptOptions): string {
  const { order, template = {}, settings = {} } = options;

  // Merge with defaults
  const receiptTemplate: Required<ReceiptTemplate> = {
    showDate: template.showDate ?? true,
    showTime: template.showTime ?? true,
    showCashier: template.showCashier ?? true,
    showTax: template.showTax ?? true,
    paperWidth: template.paperWidth ?? 80,
    header: template.header ?? "",
    footer: template.footer ?? "Terima kasih atas kunjungan Anda!",
  };

  const storeSettings: Required<StoreSettings> = {
    storeName: settings.storeName ?? "Warung Nasi Goreng",
    address: settings.address ?? "",
    phone: settings.phone ?? "",
    taxRate: settings.taxRate ?? 10,
    currency: settings.currency ?? "IDR",
  };

  // Calculate width in characters (approximate: 58mm = 32 chars, 80mm = 48 chars)
  const width = receiptTemplate.paperWidth === 58 ? 32 : 48;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(date));
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  // Generate HTML
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt - ${order.orderNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.4;
      color: #000;
      background: #fff;
      padding: 10px;
      max-width: ${receiptTemplate.paperWidth === 58 ? '58mm' : '80mm'};
      margin: 0 auto;
    }

    @media print {
      body {
        padding: 0;
      }
    }

    .receipt {
      width: 100%;
    }

    .header {
      text-align: center;
      margin-bottom: 10px;
      border-bottom: 1px dashed #000;
      padding-bottom: 10px;
    }

    .header h1 {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 5px;
    }

    .header p {
      font-size: 11px;
      margin: 2px 0;
    }

    .custom-header {
      text-align: center;
      margin-bottom: 10px;
      font-size: 11px;
      white-space: pre-wrap;
    }

    .info {
      margin-bottom: 10px;
      font-size: 11px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      margin: 3px 0;
    }

    .items {
      margin-bottom: 10px;
      border-top: 1px dashed #000;
      padding-top: 5px;
    }

    .item {
      display: flex;
      justify-content: space-between;
      margin: 5px 0;
      font-size: 11px;
    }

    .item-details {
      flex: 1;
    }

    .item-name {
      font-weight: bold;
    }

    .item-qty {
      color: #666;
    }

    .item-price {
      text-align: right;
      white-space: nowrap;
    }

    .totals {
      border-top: 1px dashed #000;
      padding-top: 5px;
      margin-bottom: 10px;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      margin: 3px 0;
      font-size: 11px;
    }

    .total-row.grand-total {
      font-size: 14px;
      font-weight: bold;
      margin-top: 5px;
      border-top: 1px dashed #000;
      padding-top: 5px;
    }

    .footer {
      text-align: center;
      border-top: 1px dashed #000;
      padding-top: 10px;
      margin-top: 10px;
      font-size: 11px;
    }

    .custom-footer {
      white-space: pre-wrap;
      margin-bottom: 5px;
    }

    .payment-info {
      text-align: center;
      margin-top: 5px;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="receipt">
`;

  // Store header
  html += `
    <div class="header">
      <h1>${storeSettings.storeName}</h1>
      ${storeSettings.address ? `<p>${storeSettings.address}</p>` : ""}
      ${storeSettings.phone ? `<p>Tel: ${storeSettings.phone}</p>` : ""}
    </div>
  `;

  // Custom header
  if (receiptTemplate.header) {
    html += `
    <div class="custom-header">${receiptTemplate.header}</div>
    `;
  }

  // Order info
  html += `
    <div class="info">
      <div class="info-row">
        <span>No. Order:</span>
        <span>${order.orderNumber}</span>
      </div>
  `;

  if (receiptTemplate.showDate) {
    html += `
      <div class="info-row">
        <span>Tanggal:</span>
        <span>${formatDate(order.createdAt)}</span>
      </div>
    `;
  }

  if (receiptTemplate.showTime) {
    html += `
      <div class="info-row">
        <span>Jam:</span>
        <span>${formatTime(order.createdAt)}</span>
      </div>
    `;
  }

  if (receiptTemplate.showCashier && order.user) {
    html += `
      <div class="info-row">
        <span>Kasir:</span>
        <span>${order.user.name}</span>
      </div>
    `;
  }

  html += `</div>`;

  // Items
  html += `<div class="items">`;
  order.items.forEach((item) => {
    const itemTotal = item.price * item.quantity;
    html += `
      <div class="item">
        <div class="item-details">
          <div class="item-name">${item.menu.name}</div>
          <div class="item-qty">${item.quantity} x ${formatCurrency(item.price)}</div>
          ${item.notes ? `<div class="item-notes">${item.notes}</div>` : ""}
        </div>
        <div class="item-price">${formatCurrency(itemTotal)}</div>
      </div>
    `;
  });
  html += `</div>`;

  // Totals
  html += `
    <div class="totals">
      <div class="total-row">
        <span>Subtotal:</span>
        <span>${formatCurrency(order.subtotal)}</span>
      </div>
  `;

  if (receiptTemplate.showTax && order.tax > 0) {
    html += `
      <div class="total-row">
        <span>Pajak (${storeSettings.taxRate}%):</span>
        <span>${formatCurrency(order.tax)}</span>
      </div>
    `;
  }

  if (order.discount > 0) {
    html += `
      <div class="total-row">
        <span>Diskon:</span>
        <span>-${formatCurrency(order.discount)}</span>
      </div>
    `;
  }

  html += `
      <div class="total-row grand-total">
        <span>TOTAL:</span>
        <span>${formatCurrency(order.total)}</span>
      </div>
    </div>
  `;

  // Payment method
  const paymentMethodNames: Record<string, string> = {
    CASH: "Tunai",
    QRIS: "QRIS",
    DEBIT: "Debit",
  };

  html += `
    <div class="payment-info">
      <p>Pembayaran: ${paymentMethodNames[order.paymentMethod] || order.paymentMethod}</p>
    </div>
  `;

  // Footer
  html += `
    <div class="footer">
  `;

  if (receiptTemplate.footer) {
    html += `
      <div class="custom-footer">${receiptTemplate.footer}</div>
    `;
  }

  html += `
      <p>${formatDate(order.createdAt)} ${formatTime(order.createdAt)}</p>
    </div>
  `;

  html += `
  </div>
</body>
</html>
  `;

  return html;
}

/**
 * Print receipt using browser print API
 */
export function printReceipt(options: ReceiptOptions): void {
  try {
    const html = generateReceiptHTML(options);

    // Create a new window for printing
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      throw new Error("Unable to open print window. Please allow popups for this site.");
    }

    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for content to load before printing
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        // Close the window after printing (optional - some browsers keep it open)
        // printWindow.close();
      }, 250);
    };
  } catch (error) {
    console.error("Error printing receipt:", error);
    throw error;
  }
}
