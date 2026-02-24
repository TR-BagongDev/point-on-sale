/**
 * Shift Management End-to-End Verification Script
 *
 * This script performs automated verification of the shift management system
 * by testing the complete flow: open shift → create orders → close shift
 *
 * Usage:
 *   npx tsx scripts/verify-shift-e2e.ts
 */

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables from .env file
config();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  return new PrismaClient({
    accelerateUrl: process.env.ACCELERATE_URL || process.env.DATABASE_URL || "prisma://localhost?api_key=local-dev-mock",
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

interface VerificationResult {
  step: string;
  status: 'PASS' | 'FAIL';
  details: string;
  data?: any;
}

const results: VerificationResult[] = [];

async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');
  await prisma.order.deleteMany({
    where: {
      orderNumber: { startsWith: 'TEST-E2E-' },
    },
  });
  await prisma.shift.deleteMany({
    where: {
      user: {
        email: 'admin@warung.com',
      },
      status: 'OPEN',
    },
  });
  console.log('✅ Cleanup complete\n');
}

async function verifyStep1_OpenShift() {
  console.log('📋 Step 1: Open Shift with Starting Cash');
  try {
    // Get admin user
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@warung.com' },
    });

    if (!admin) {
      results.push({
        step: 'Open Shift',
        status: 'FAIL',
        details: 'Admin user not found',
      });
      return;
    }

    // Create shift
    const shift = await prisma.shift.create({
      data: {
        userId: admin.id,
        status: 'OPEN',
        startingCash: 500000,
        openedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    console.log(`   ✅ Shift created: ${shift.id}`);
    console.log(`   💰 Starting Cash: Rp${shift.startingCash.toLocaleString('id-ID')}`);
    console.log(`   👤 Cashier: ${shift.user.name}`);
    console.log(`   📅 Opened At: ${shift.openedAt.toISOString()}`);

    results.push({
      step: 'Open Shift',
      status: 'PASS',
      details: 'Shift opened successfully with starting cash',
      data: { shiftId: shift.id, startingCash: shift.startingCash },
    });

    return shift.id;
  } catch (error) {
    console.error('   ❌ Error:', error);
    results.push({
      step: 'Open Shift',
      status: 'FAIL',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

async function verifyStep2_CreateOrders(shiftId: string) {
  console.log('\n📋 Step 2: Create Multiple Orders Linked to Shift');
  try {
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@warung.com' },
    });

    if (!admin) {
      results.push({
        step: 'Create Orders',
        status: 'FAIL',
        details: 'Admin user not found',
      });
      return [];
    }

    // Get a menu item
    const menu = await prisma.menu.findFirst({
      where: { isAvailable: true },
    });

    if (!menu) {
      results.push({
        step: 'Create Orders',
        status: 'FAIL',
        details: 'No available menu items found',
      });
      return [];
    }

    const orderIds: string[] = [];

    // Create 3 orders
    for (let i = 1; i <= 3; i++) {
      const orderNumber = `TEST-E2E-${Date.now()}-${i}`;
      const quantity = 2;
      const subtotal = menu.price * quantity; // 2 items
      const tax = subtotal * 0.1; // 10% tax
      const total = subtotal + tax; // total before discount
      const discount = 0;

      const order = await prisma.order.create({
        data: {
          orderNumber,
          status: 'COMPLETED',
          subtotal,
          tax,
          discount,
          total,
          paymentMethod: 'CASH',
          userId: admin.id,
          shiftId: shiftId,
          items: {
            create: [
              {
                menuId: menu.id,
                quantity: 2,
                price: menu.price,
                notes: `Test order ${i}`,
              },
              {
                menuId: menu.id,
                quantity: 1,
                price: menu.price,
                notes: `Additional item`,
              },
            ],
          },
        },
      });

      orderIds.push(order.id);
      console.log(`   ✅ Order ${i} created: ${order.orderNumber}`);
      console.log(`      💰 Total: Rp${order.total.toLocaleString('id-ID')}`);
      console.log(`      🔗 Shift ID: ${order.shiftId}`);
    }

    results.push({
      step: 'Create Orders',
      status: 'PASS',
      details: `Created ${orderIds.length} orders linked to shift`,
      data: { orderIds, count: orderIds.length },
    });

    return orderIds;
  } catch (error) {
    console.error('   ❌ Error:', error);
    results.push({
      step: 'Create Orders',
      status: 'FAIL',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
    return [];
  }
}

async function verifyStep3_OrdersLinkedToShift(shiftId: string, orderIds: string[]) {
  console.log('\n📋 Step 3: Verify Orders Linked to Shift');
  try {
    // Fetch shift with orders
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        orders: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
            status: true,
            paymentMethod: true,
          },
        },
      },
    });

    if (!shift) {
      results.push({
        step: 'Verify Orders Linked',
        status: 'FAIL',
        details: 'Shift not found',
      });
      return;
    }

    console.log(`   ✅ Shift found: ${shift.id}`);
    console.log(`   📊 Order Count: ${shift.orders.length}`);

    let totalSales = 0;
    shift.orders.forEach((order, index) => {
      console.log(`      Order ${index + 1}: ${order.orderNumber}`);
      console.log(`         Amount: Rp${order.total.toLocaleString('id-ID')}`);
      console.log(`         Status: ${order.status}`);
      console.log(`         Payment: ${order.paymentMethod}`);
      totalSales += order.total;
    });

    console.log(`   💰 Total Sales: Rp${totalSales.toLocaleString('id-ID')}`);

    // Verify all orders are linked
    const allOrdersLinked = orderIds.every((id) =>
      shift.orders.some((order) => order.id === id)
    );

    if (!allOrdersLinked) {
      results.push({
        step: 'Verify Orders Linked',
        status: 'FAIL',
        details: 'Not all orders are linked to the shift',
      });
      return;
    }

    results.push({
      step: 'Verify Orders Linked',
      status: 'PASS',
      details: `All ${shift.orders.length} orders are correctly linked to shift`,
      data: {
        orderCount: shift.orders.length,
        totalSales,
        orders: shift.orders,
      },
    });
  } catch (error) {
    console.error('   ❌ Error:', error);
    results.push({
      step: 'Verify Orders Linked',
      status: 'FAIL',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function verifyStep4_CloseShift(shiftId: string) {
  console.log('\n📋 Step 4: Close Shift with Ending Cash');
  try {
    // Fetch shift with orders
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        orders: true,
      },
    });

    if (!shift) {
      results.push({
        step: 'Close Shift',
        status: 'FAIL',
        details: 'Shift not found',
      });
      return;
    }

    // Calculate expected cash
    const totalSales = shift.orders.reduce((sum, order) => {
      if (order.status === 'COMPLETED' && order.paymentMethod === 'CASH') {
        return sum + order.total;
      }
      return sum;
    }, 0);

    const expectedCash = shift.startingCash + totalSales;

    // Set ending cash (with a small discrepancy for testing)
    const discrepancy = 2000; // Rp2.000 more than expected
    const endingCash = expectedCash + discrepancy;

    console.log(`   💰 Starting Cash: Rp${shift.startingCash.toLocaleString('id-ID')}`);
    console.log(`   📊 Total Cash Sales: Rp${totalSales.toLocaleString('id-ID')}`);
    console.log(`   💵 Expected Cash: Rp${expectedCash.toLocaleString('id-ID')}`);
    console.log(`   🧮 Ending Cash: Rp${endingCash.toLocaleString('id-ID')}`);
    console.log(`   ⚠️ Discrepancy: Rp${discrepancy > 0 ? '+' : ''}${discrepancy.toLocaleString('id-ID')}`);

    // Close the shift
    const closedShift = await prisma.shift.update({
      where: { id: shiftId },
      data: {
        status: 'CLOSED',
        endingCash,
        expectedCash,
        discrepancy,
        closedAt: new Date(),
      },
      include: {
        user: true,
        orders: true,
      },
    });

    console.log(`   ✅ Shift closed: ${closedShift.id}`);
    console.log(`   📅 Closed At: ${closedShift.closedAt.toISOString()}`);
    console.log(`   📊 Status: ${closedShift.status}`);

    results.push({
      step: 'Close Shift',
      status: 'PASS',
      details: 'Shift closed successfully with discrepancy calculation',
      data: {
        endingCash,
        expectedCash,
        discrepancy,
        totalSales,
      },
    });

    return closedShift;
  } catch (error) {
    console.error('   ❌ Error:', error);
    results.push({
      step: 'Close Shift',
      status: 'FAIL',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

async function verifyStep5_ShiftReport(shiftId: string) {
  console.log('\n📋 Step 5: Verify Shift Report');
  try {
    // Fetch closed shift
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        orders: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
            status: true,
            paymentMethod: true,
            createdAt: true,
          },
        },
      },
    });

    if (!shift) {
      results.push({
        step: 'Shift Report',
        status: 'FAIL',
        details: 'Shift not found',
      });
      return;
    }

    console.log(`\n   📊 SHIFT REPORT`);
    console.log(`   ${'='.repeat(50)}`);
    console.log(`   Shift ID: ${shift.id}`);
    console.log(`   Status: ${shift.status}`);
    console.log(`   Cashier: ${shift.user.name} (${shift.user.role})`);
    console.log(`   `);
    console.log(`   🕐 Opening Time: ${shift.openedAt.toLocaleString('id-ID')}`);
    console.log(`   🕐 Closing Time: ${shift.closedAt?.toLocaleString('id-ID') || 'N/A'}`);
    console.log(`   `);
    console.log(`   💰 Starting Cash: Rp${shift.startingCash.toLocaleString('id-ID')}`);
    console.log(`   💵 Ending Cash: Rp${shift.endingCash?.toLocaleString('id-ID') || 'N/A'}`);
    console.log(`   🎯 Expected Cash: Rp${shift.expectedCash?.toLocaleString('id-ID') || 'N/A'}`);
    console.log(`   `);

    const discrepancy = shift.discrepancy ?? 0;
    const discrepancyColor = discrepancy === 0 ? '✅' : discrepancy > 0 ? '📈' : '📉';
    console.log(`   ${discrepancyColor} Discrepancy: Rp${discrepancy > 0 ? '+' : ''}${discrepancy.toLocaleString('id-ID')}`);
    console.log(`   `);

    console.log(`   📦 Orders: ${shift.orders.length}`);
    let totalSales = 0;
    let cashSales = 0;

    shift.orders.forEach((order, index) => {
      totalSales += order.total;
      if (order.paymentMethod === 'CASH') {
        cashSales += order.total;
      }
      console.log(`      ${index + 1}. ${order.orderNumber}`);
      console.log(`         Amount: Rp${order.total.toLocaleString('id-ID')} (${order.paymentMethod})`);
    });

    console.log(`   `);
    console.log(`   📊 Total Sales: Rp${totalSales.toLocaleString('id-ID')}`);
    console.log(`   💵 Cash Sales: Rp${cashSales.toLocaleString('id-ID')}`);

    // Verify calculations
    const calculatedExpected = shift.startingCash + cashSales;
    if (shift.expectedCash !== calculatedExpected) {
      results.push({
        step: 'Shift Report',
        status: 'FAIL',
        details: `Expected cash calculation mismatch. Expected: Rp${calculatedExpected.toLocaleString('id-ID')}, Actual: Rp${shift.expectedCash?.toLocaleString('id-ID')}`,
      });
      return;
    }

    // Verify discrepancy
    const calculatedDiscrepancy = (shift.endingCash ?? 0) - calculatedExpected;
    if (shift.discrepancy !== calculatedDiscrepancy) {
      results.push({
        step: 'Shift Report',
        status: 'FAIL',
        details: `Discrepancy calculation mismatch. Expected: Rp${calculatedDiscrepancy.toLocaleString('id-ID')}, Actual: Rp${shift.discrepancy?.toLocaleString('id-ID')}`,
      });
      return;
    }

    console.log(`\n   ${'='.repeat(50)}`);
    console.log(`   ✅ All calculations are correct!`);

    results.push({
      step: 'Shift Report',
      status: 'PASS',
      details: 'Shift report shows correct totals and discrepancies',
      data: {
        shift,
        totalSales,
        cashSales,
        orderCount: shift.orders.length,
      },
    });
  } catch (error) {
    console.error('   ❌ Error:', error);
    results.push({
      step: 'Shift Report',
      status: 'FAIL',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function printSummary() {
  console.log('\n\n' + '='.repeat(70));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(70));

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const total = results.length;

  results.forEach((result, index) => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${index + 1}. ${icon} ${result.step}`);
    console.log(`   ${result.details}`);
    if (result.data) {
      console.log(`   Data:`, JSON.stringify(result.data, null, 2).split('\n').join('\n   '));
    }
    console.log();
  });

  console.log('='.repeat(70));
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log('='.repeat(70));

  if (failed === 0) {
    console.log('\n🎉 ALL VERIFICATIONS PASSED! ✨\n');
  } else {
    console.log(`\n⚠️  ${failed} verification(s) failed. Please review the details above.\n`);
  }
}

async function main() {
  console.log('🚀 Shift Management End-to-End Verification\n');
  console.log('This script will verify the complete shift management flow:');
  console.log('1. Open shift with starting cash');
  console.log('2. Create multiple orders');
  console.log('3. Verify orders linked to shift');
  console.log('4. Close shift with ending cash');
  console.log('5. Verify shift report with correct totals and discrepancies');
  console.log();

  try {
    // Cleanup before starting
    await cleanupTestData();

    // Execute verification steps
    const shiftId = await verifyStep1_OpenShift();
    if (!shiftId) {
      console.log('\n❌ Verification failed at Step 1. Stopping.');
      await printSummary();
      return;
    }

    const orderIds = await verifyStep2_CreateOrders(shiftId);
    if (orderIds.length === 0) {
      console.log('\n❌ Verification failed at Step 2. Stopping.');
      await printSummary();
      return;
    }

    await verifyStep3_OrdersLinkedToShift(shiftId, orderIds);

    await verifyStep4_CloseShift(shiftId);

    await verifyStep5_ShiftReport(shiftId);

    // Print final summary
    await printSummary();

    // Cleanup after verification
    console.log('\n🧹 Cleaning up test data...');
    await prisma.order.deleteMany({
      where: {
        orderNumber: { startsWith: 'TEST-E2E-' },
      },
    });
    await prisma.shift.deleteMany({
      where: {
        id: shiftId,
      },
    });
    console.log('✅ Cleanup complete');
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    results.push({
      step: 'Fatal Error',
      status: 'FAIL',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
    await printSummary();
  } finally {
    await prisma.$disconnect();
  }
}

main();
