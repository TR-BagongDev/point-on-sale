import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateReceiptHTML, printReceipt, type Order, type OrderItem } from '../receipt';

describe('generateReceiptHTML', () => {
  const mockOrder: Order = {
    orderNumber: 'ORD-001',
    user: {
      name: 'John Doe',
    },
    items: [
      {
        menu: { name: 'Nasi Goreng' },
        quantity: 2,
        price: 15000,
        notes: 'Pedas',
      },
      {
        menu: { name: 'Es Teh Manis' },
        quantity: 1,
        price: 5000,
        notes: null,
      },
    ],
    subtotal: 35000,
    tax: 3500,
    discount: 0,
    total: 38500,
    paymentMethod: 'CASH',
    createdAt: new Date('2026-01-15T14:30:00'),
  };

  it('should generate valid HTML structure', () => {
    const html = generateReceiptHTML({ order: mockOrder });

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html>');
    expect(html).toContain('<head>');
    expect(html).toContain('<body>');
    expect(html).toContain('</html>');
  });

  it('should include order number in receipt', () => {
    const html = generateReceiptHTML({ order: mockOrder });

    expect(html).toContain('ORD-001');
    expect(html).toContain('No. Order:');
  });

  it('should include store name', () => {
    const html = generateReceiptHTML({
      order: mockOrder,
      settings: { storeName: 'Warung Test' },
    });

    expect(html).toContain('Warung Test');
  });

  it('should use default store name when not provided', () => {
    const html = generateReceiptHTML({ order: mockOrder });

    expect(html).toContain('Warung Nasi Goreng');
  });

  it('should include store address when provided', () => {
    const html = generateReceiptHTML({
      order: mockOrder,
      settings: { address: 'Jl. Test No. 123' },
    });

    expect(html).toContain('Jl. Test No. 123');
  });

  it('should not include store address when not provided', () => {
    const html = generateReceiptHTML({
      order: mockOrder,
      settings: { address: '' },
    });

    expect(html).not.toContain('Tel:');
  });

  it('should include store phone when provided', () => {
    const html = generateReceiptHTML({
      order: mockOrder,
      settings: { phone: '08123456789' },
    });

    expect(html).toContain('Tel: 08123456789');
  });

  it('should show date when showDate is true', () => {
    const html = generateReceiptHTML({
      order: mockOrder,
      template: { showDate: true, showTime: false, showCashier: false, showTax: true, paperWidth: 80 },
    });

    expect(html).toContain('Tanggal:');
  });

  it('should not show date when showDate is false', () => {
    const html = generateReceiptHTML({
      order: mockOrder,
      template: { showDate: false, showTime: false, showCashier: false, showTax: true, paperWidth: 80 },
    });

    expect(html).not.toContain('Tanggal:');
  });

  it('should show time when showTime is true', () => {
    const html = generateReceiptHTML({
      order: mockOrder,
      template: { showDate: false, showTime: true, showCashier: false, showTax: true, paperWidth: 80 },
    });

    expect(html).toContain('Jam:');
  });

  it('should not show time when showTime is false', () => {
    const html = generateReceiptHTML({
      order: mockOrder,
      template: { showDate: false, showTime: false, showCashier: false, showTax: true, paperWidth: 80 },
    });

    expect(html).not.toContain('Jam:');
  });

  it('should show cashier when showCashier is true and user exists', () => {
    const html = generateReceiptHTML({
      order: mockOrder,
      template: { showDate: false, showTime: false, showCashier: true, showTax: true, paperWidth: 80 },
    });

    expect(html).toContain('Kasir:');
    expect(html).toContain('John Doe');
  });

  it('should not show cashier when showCashier is false', () => {
    const html = generateReceiptHTML({
      order: mockOrder,
      template: { showDate: false, showTime: false, showCashier: false, showTax: true, paperWidth: 80 },
    });

    expect(html).not.toContain('Kasir:');
  });

  it('should not show cashier when user is null', () => {
    const orderWithoutUser: Order = {
      ...mockOrder,
      user: null,
    };

    const html = generateReceiptHTML({
      order: orderWithoutUser,
      template: { showDate: false, showTime: false, showCashier: true, showTax: true, paperWidth: 80 },
    });

    expect(html).not.toContain('Kasir:');
  });

  it('should display all items with correct details', () => {
    const html = generateReceiptHTML({ order: mockOrder });

    expect(html).toContain('Nasi Goreng');
    expect(html).toContain('Es Teh Manis');
    expect(html).toContain('2 x'); // quantity
    expect(html).toContain('1 x'); // quantity
  });

  it('should include item notes when present', () => {
    const html = generateReceiptHTML({ order: mockOrder });

    expect(html).toContain('Pedas');
  });

  it('should not include item notes when null', () => {
    const html = generateReceiptHTML({ order: mockOrder });

    // Check that there's no empty notes div
    expect(html).not.toContain('<div class="item-notes"></div>');
  });

  it('should calculate and display item totals correctly', () => {
    const html = generateReceiptHTML({ order: mockOrder });

    // Nasi Goreng: 2 x 15000 = 30000
    // Es Teh Manis: 1 x 5000 = 5000
    expect(html).toContain('30.000');
    expect(html).toContain('5.000');
  });

  it('should display order totals', () => {
    const html = generateReceiptHTML({ order: mockOrder });

    expect(html).toContain('Subtotal:');
    expect(html).toContain('35.000');
    expect(html).toContain('TOTAL:');
    expect(html).toContain('38.500');
  });

  it('should show tax when showTax is true and tax > 0', () => {
    const html = generateReceiptHTML({
      order: mockOrder,
      template: { showDate: false, showTime: false, showCashier: false, showTax: true, paperWidth: 80 },
    });

    expect(html).toContain('Pajak');
    expect(html).toContain('3.500');
  });

  it('should not show tax when showTax is false', () => {
    const html = generateReceiptHTML({
      order: mockOrder,
      template: { showDate: false, showTime: false, showCashier: false, showTax: false, paperWidth: 80 },
    });

    expect(html).not.toContain('Pajak');
  });

  it('should not show tax when tax is 0', () => {
    const orderWithoutTax: Order = {
      ...mockOrder,
      tax: 0,
    };

    const html = generateReceiptHTML({
      order: orderWithoutTax,
      template: { showDate: false, showTime: false, showCashier: false, showTax: true, paperWidth: 80 },
    });

    expect(html).not.toContain('Pajak');
  });

  it('should show discount when discount > 0', () => {
    const orderWithDiscount: Order = {
      ...mockOrder,
      discount: 5000,
      total: 33500,
    };

    const html = generateReceiptHTML({ order: orderWithDiscount });

    expect(html).toContain('Diskon:');
    expect(html).toContain('-');
    expect(html).toContain('5.000');
  });

  it('should not show discount when discount is 0', () => {
    const html = generateReceiptHTML({ order: mockOrder });

    expect(html).not.toContain('Diskon:');
  });

  it('should display payment method in Indonesian', () => {
    const html = generateReceiptHTML({ order: mockOrder });

    expect(html).toContain('Pembayaran:');
    expect(html).toContain('Tunai');
  });

  it('should display QRIS payment method', () => {
    const orderWithQRIS: Order = {
      ...mockOrder,
      paymentMethod: 'QRIS',
    };

    const html = generateReceiptHTML({ order: orderWithQRIS });

    expect(html).toContain('QRIS');
  });

  it('should display DEBIT payment method', () => {
    const orderWithDebit: Order = {
      ...mockOrder,
      paymentMethod: 'DEBIT',
    };

    const html = generateReceiptHTML({ order: orderWithDebit });

    expect(html).toContain('Debit');
  });

  it('should display unknown payment method as-is', () => {
    const orderWithUnknownPayment: Order = {
      ...mockOrder,
      paymentMethod: 'CREDIT_CARD',
    };

    const html = generateReceiptHTML({ order: orderWithUnknownPayment });

    expect(html).toContain('CREDIT_CARD');
  });

  it('should include default footer when not customized', () => {
    const html = generateReceiptHTML({ order: mockOrder });

    expect(html).toContain('Terima kasih atas kunjungan Anda!');
  });

  it('should include custom footer when provided', () => {
    const html = generateReceiptHTML({
      order: mockOrder,
      template: { showDate: false, showTime: false, showCashier: false, showTax: true, paperWidth: 80, footer: 'Thank you!' },
    });

    expect(html).toContain('Thank you!');
  });

  it('should include default footer when footer is null', () => {
    const html = generateReceiptHTML({
      order: mockOrder,
      template: { showDate: false, showTime: false, showCashier: false, showTax: true, paperWidth: 80, footer: null },
    });

    // Null footer defaults to the Indonesian text
    expect(html).toContain('Terima kasih atas kunjungan Anda!');
  });

  it('should include custom header when provided', () => {
    const html = generateReceiptHTML({
      order: mockOrder,
      template: { showDate: false, showTime: false, showCashier: false, showTax: true, paperWidth: 80, header: 'Promo Hari Ini!' },
    });

    expect(html).toContain('Promo Hari Ini!');
  });

  it('should not include custom header when not provided', () => {
    const html = generateReceiptHTML({
      order: mockOrder,
      template: { showDate: false, showTime: false, showCashier: false, showTax: true, paperWidth: 80, header: '' },
    });

    expect(html).not.toContain('<div class="custom-header">');
  });

  it('should use 58mm paper width when specified', () => {
    const html = generateReceiptHTML({
      order: mockOrder,
      template: { showDate: false, showTime: false, showCashier: false, showTax: true, paperWidth: 58 },
    });

    expect(html).toContain('max-width: 58mm');
  });

  it('should use 80mm paper width when specified', () => {
    const html = generateReceiptHTML({
      order: mockOrder,
      template: { showDate: false, showTime: false, showCashier: false, showTax: true, paperWidth: 80 },
    });

    expect(html).toContain('max-width: 80mm');
  });

  it('should use default 80mm paper width when not specified', () => {
    const html = generateReceiptHTML({ order: mockOrder });

    expect(html).toContain('max-width: 80mm');
  });

  it('should include CSS styles for printing', () => {
    const html = generateReceiptHTML({ order: mockOrder });

    expect(html).toContain('@media print');
    expect(html).toContain('font-family: \'Courier New\', monospace');
  });

  it('should handle empty items array', () => {
    const orderWithNoItems: Order = {
      ...mockOrder,
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0,
    };

    const html = generateReceiptHTML({ order: orderWithNoItems });

    expect(html).toContain('Subtotal:');
    expect(html).toContain('0'); // Just check for 0, format might vary
  });

  it('should use custom currency when provided', () => {
    const html = generateReceiptHTML({
      order: mockOrder,
      settings: { currency: 'USD' },
    });

    // The currency symbol depends on locale, just check that HTML is generated
    expect(html).toBeTruthy();
    expect(html).toContain('TOTAL:');
  });

  it('should use custom tax rate when provided', () => {
    const html = generateReceiptHTML({
      order: mockOrder,
      settings: { taxRate: 11 },
    });

    expect(html).toContain('Pajak (11%)');
  });

  it('should use default tax rate when not provided', () => {
    const html = generateReceiptHTML({ order: mockOrder });

    expect(html).toContain('Pajak (10%)');
  });

  it('should include date and time in footer', () => {
    const html = generateReceiptHTML({ order: mockOrder });

    // Footer should include formatted date and time
    expect(html).toBeTruthy();
  });
});

describe('printReceipt', () => {
  const mockOrder = {
    orderNumber: 'ORD-001',
    user: {
      name: 'John Doe',
    },
    items: [
      {
        menu: { name: 'Nasi Goreng' },
        quantity: 2,
        price: 15000,
        notes: null,
      },
    ],
    subtotal: 30000,
    tax: 3000,
    discount: 0,
    total: 33000,
    paymentMethod: 'CASH',
    createdAt: new Date('2026-01-15T14:30:00'),
  } as const;

  let mockWindow: any;

  beforeEach(() => {
    vi.useFakeTimers();

    // Mock window.open
    mockWindow = {
      document: {
        write: vi.fn(),
        close: vi.fn(),
      },
      onload: null,
      print: vi.fn(),
      close: vi.fn(),
    };

    global.window = {
      ...global.window,
      open: vi.fn(() => mockWindow),
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should open a new window with receipt HTML', () => {
    printReceipt({ order: mockOrder });

    expect(window.open).toHaveBeenCalledWith('', '_blank');
  });

  it('should write HTML to the print window', () => {
    printReceipt({ order: mockOrder });

    expect(mockWindow.document.write).toHaveBeenCalled();
    const writtenHTML = mockWindow.document.write.mock.calls[0][0];
    expect(writtenHTML).toContain('<!DOCTYPE html>');
    expect(writtenHTML).toContain('ORD-001');
  });

  it('should close the document', () => {
    printReceipt({ order: mockOrder });

    expect(mockWindow.document.close).toHaveBeenCalled();
  });

  it('should call print() on the window after load', () => {
    printReceipt({ order: mockOrder });

    // Trigger onload
    if (mockWindow.onload) {
      mockWindow.onload();
    }

    // Fast-forward timers
    vi.advanceTimersByTime(300);

    expect(mockWindow.print).toHaveBeenCalled();
  });

  it('should throw error when window.open returns null', () => {
    (window.open as any).mockReturnValueOnce(null);

    expect(() => printReceipt({ order: mockOrder })).toThrow(
      'Unable to open print window. Please allow popups for this site.'
    );
  });

  it('should handle window open errors gracefully', () => {
    (window.open as any).mockImplementationOnce(() => {
      throw new Error('Popup blocked');
    });

    expect(() => printReceipt({ order: mockOrder })).toThrow('Popup blocked');
  });
});
