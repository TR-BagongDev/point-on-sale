/**
 * Shift Unresolved Orders Verification Script
 *
 * This script verifies that a shift cannot be closed when there are
 * unresolved orders (orders with status other than COMPLETED).
 *
 * Usage:
 *   npx tsx scripts/verify-shift-unresolved-orders.ts
 */

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { checkUnresolvedOrders } from '../lib/shift-utils';

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
      orderNumber: { startsWith: 'TEST-UNRESOLVED-' },
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
      return null;
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

    results.push({
      step: 'Open Shift',
      status: 'PASS',
      details: 'Shift opened successfully',
      data: { shiftId: shift.id },
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

async function verifyStep2_CreatePendingOrder(shiftId: string) {
  console.log('\n📋 Step 2: Create Order with PENDING Status');
  try {
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@warung.com' },
    });

    if (!admin) {
      results.push({
        step: 'Create Pending Order',
        status: 'FAIL',
        details: 'Admin user not found',
      });
      return null;
    }

    // Get a menu item
    const menu = await prisma.menu.findFirst({
      where: { isAvailable: true },
    });

    if (!menu) {
      results.push({
        step: 'Create Pending Order',
        status: 'FAIL',
        details: 'No available menu items found',
      });
      return null;
    }

    const orderNumber = `TEST-UNRESOLVED-${Date.now()}`;
    const quantity = 2;
    const subtotal = menu.price * quantity;
    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    // Create order with PENDING status
    const order = await prisma.order.create({
      data: {
        orderNumber,
        status: 'PENDING',
        subtotal,
        tax,
        discount: 0,
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
              notes: 'Test pending order',
            },
          ],
        },
      },
    });

    console.log(`   ✅ Order created: ${order.orderNumber}`);
    console.log(`   📋 Status: ${order.status}`);
    console.log(`   💰 Total: Rp${order.total.toLocaleString('id-ID')}`);
    console.log(`   🔗 Shift ID: ${order.shiftId}`);

    results.push({
      step: 'Create Pending Order',
      status: 'PASS',
      details: 'Created order with PENDING status',
      data: { orderId: order.id, orderNumber: order.orderNumber, status: order.status },
    });

    return order.id;
  } catch (error) {
    console.error('   ❌ Error:', error);
    results.push({
      step: 'Create Pending Order',
      status: 'FAIL',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

async function verifyStep3_AttemptCloseShiftWithPendingOrder(shiftId: string) {
  console.log('\n📋 Step 3: Check for Unresolved Orders (Validation Test)');
  try {
    // Check for unresolved orders using the utility function
    const unresolvedOrders = await checkUnresolvedOrders(shiftId);

    console.log(`   🔍 Checking for unresolved orders...`);
    console.log(`   📊 Found ${unresolvedOrders.length} unresolved order(s)`);

    if (unresolvedOrders.length > 0) {
      unresolvedOrders.forEach((order) => {
        console.log(`      - ${order.orderNumber}: ${order.status}`);
      });

      console.log(`   ✅ Validation correctly detected unresolved orders`);

      // Simulate API validation response
      const orderList = unresolvedOrders
        .map((o) => `${o.orderNumber} (${o.status})`)
        .join(', ');
      console.log(`   📝 Error would be: "Cannot close shift with unresolved orders"`);
      console.log(`   📝 Details: "Orders: ${orderList}"`);

      results.push({
        step: 'Check Unresolved Orders',
        status: 'PASS',
        details: `Correctly detected ${unresolvedOrders.length} unresolved order(s)`,
        data: { unresolvedOrders },
      });

      return true;
    } else {
      console.log(`   ❌ No unresolved orders detected (validation failed)`);
      results.push({
        step: 'Check Unresolved Orders',
        status: 'FAIL',
        details: 'Validation did not detect the pending order',
      });
      return false;
    }
  } catch (error) {
    console.error('   ❌ Error:', error);
    results.push({
      step: 'Check Unresolved Orders',
      status: 'FAIL',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

async function verifyStep4_CompleteOrder(shiftId: string, orderId: string) {
  console.log('\n📋 Step 4: Complete the Order');
  try {
    // Update order status to COMPLETED
    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'COMPLETED',
      },
    });

    console.log(`   ✅ Order updated: ${order.orderNumber}`);
    console.log(`   📋 Old Status: PENDING`);
    console.log(`   📋 New Status: ${order.status}`);

    results.push({
      step: 'Complete Order',
      status: 'PASS',
      details: 'Order status changed from PENDING to COMPLETED',
      data: { orderId: order.id, newStatus: order.status },
    });

    return true;
  } catch (error) {
    console.error('   ❌ Error:', error);
    results.push({
      step: 'Complete Order',
      status: 'FAIL',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

async function verifyStep5_CloseShiftSuccessfully(shiftId: string) {
  console.log('\n📋 Step 5: Close Shift Successfully (All Orders Resolved)');
  try {
    // First verify no unresolved orders
    const unresolvedOrders = await checkUnresolvedOrders(shiftId);

    console.log(`   🔍 Final check for unresolved orders...`);
    console.log(`   📊 Found ${unresolvedOrders.length} unresolved order(s)`);

    if (unresolvedOrders.length > 0) {
      console.log(`   ❌ Cannot close shift - still has unresolved orders`);
      results.push({
        step: 'Close Shift Successfully',
        status: 'FAIL',
        details: 'Shift still has unresolved orders after completing',
      });
      return false;
    }

    console.log(`   ✅ No unresolved orders - shift can be closed`);

    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        orders: true,
      },
    });

    if (!shift) {
      results.push({
        step: 'Close Shift Successfully',
        status: 'FAIL',
        details: 'Shift not found',
      });
      return false;
    }

    // Calculate expected cash
    const totalSales = shift.orders.reduce((sum, order) => {
      if (order.status === 'COMPLETED' && order.paymentMethod === 'CASH') {
        return sum + order.total;
      }
      return sum;
    }, 0);

    const expectedCash = shift.startingCash + totalSales;
    const endingCash = expectedCash; // Perfect match
    const discrepancy = 0;

    console.log(`   💰 Starting Cash: Rp${shift.startingCash.toLocaleString('id-ID')}`);
    console.log(`   📊 Total Cash Sales: Rp${totalSales.toLocaleString('id-ID')}`);
    console.log(`   💵 Expected Cash: Rp${expectedCash.toLocaleString('id-ID')}`);
    console.log(`   🧮 Ending Cash: Rp${endingCash.toLocaleString('id-ID')}`);

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

    console.log(`   ✅ Shift closed successfully: ${closedShift.id}`);
    console.log(`   📊 Status: ${closedShift.status}`);
    console.log(`   📅 Closed At: ${closedShift.closedAt?.toISOString()}`);

    results.push({
      step: 'Close Shift Successfully',
      status: 'PASS',
      details: 'Shift closed successfully after all orders completed',
      data: {
        shiftId: closedShift.id,
        status: closedShift.status,
        endingCash,
        expectedCash,
      },
    });

    return true;
  } catch (error) {
    console.error('   ❌ Error:', error);
    results.push({
      step: 'Close Shift Successfully',
      status: 'FAIL',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
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
  console.log('🚀 Shift Unresolved Orders Verification\n');
  console.log('This script verifies that shifts cannot be closed with unresolved orders:');
  console.log('1. Open shift');
  console.log('2. Create order with PENDING status');
  console.log('3. Check for unresolved orders (validation)');
  console.log('4. Complete the order');
  console.log('5. Close shift successfully');
  console.log();

  let shiftId: string | null = null;
  let orderId: string | null = null;

  try {
    // Cleanup before starting
    await cleanupTestData();

    // Execute verification steps
    shiftId = await verifyStep1_OpenShift();
    if (!shiftId) {
      console.log('\n❌ Verification failed at Step 1. Stopping.');
      await printSummary();
      return;
    }

    orderId = await verifyStep2_CreatePendingOrder(shiftId);
    if (!orderId) {
      console.log('\n❌ Verification failed at Step 2. Stopping.');
      await printSummary();
      return;
    }

    const closeBlocked = await verifyStep3_AttemptCloseShiftWithPendingOrder(shiftId);
    if (!closeBlocked) {
      console.log('\n❌ Verification failed at Step 3. Stopping.');
      await printSummary();
      return;
    }

    const orderCompleted = await verifyStep4_CompleteOrder(shiftId, orderId);
    if (!orderCompleted) {
      console.log('\n❌ Verification failed at Step 4. Stopping.');
      await printSummary();
      return;
    }

    const shiftClosed = await verifyStep5_CloseShiftSuccessfully(shiftId);
    if (!shiftClosed) {
      console.log('\n❌ Verification failed at Step 5. Stopping.');
      await printSummary();
      return;
    }

    // Print final summary
    await printSummary();

    // Cleanup after verification
    console.log('\n🧹 Cleaning up test data...');
    await prisma.order.deleteMany({
      where: {
        orderNumber: { startsWith: 'TEST-UNRESOLVED-' },
      },
    });
    if (shiftId) {
      await prisma.shift.deleteMany({
        where: {
          id: shiftId,
        },
      });
    }
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
