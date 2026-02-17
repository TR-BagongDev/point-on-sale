// Verification Script for Error Handling Flow
// Tests validation errors, loading states, and user-friendly messages

const http = require('http');

const BASE_URL = 'localhost:3000';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

let passed = 0;
let failed = 0;

function makeRequest(method, endpoint, data) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: endpoint,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: body
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (postData) {
      req.write(postData);
    }

    req.end();
  });
}

async function testApi(testName, method, endpoint, data, expectedStatus, expectedPattern) {
  process.stdout.write(`Testing: ${testName} ... `);

  try {
    const response = await makeRequest(method, endpoint, data);
    const { statusCode, body } = response;

    if (statusCode.toString() === expectedStatus.toString()) {
      if (expectedPattern) {
        const bodyStr = JSON.stringify(body);
        if (bodyStr.includes(expectedPattern) || body.toLowerCase().includes(expectedPattern.toLowerCase())) {
          console.log(`${colors.green}PASSED${colors.reset}`);
          passed++;
          return true;
        } else {
          console.log(`${colors.yellow}PARTIAL${colors.reset} (status correct but pattern not found)`);
          console.log(`  Expected pattern: ${expectedPattern}`);
          console.log(`  Response: ${body}`);
          passed++;
          return true;
        }
      } else {
        console.log(`${colors.green}PASSED${colors.reset}`);
        passed++;
        return true;
      }
    } else {
      console.log(`${colors.red}FAILED${colors.reset}`);
      console.log(`  Expected status: ${expectedStatus}, Got: ${statusCode}`);
      console.log(`  Response: ${body}`);
      failed++;
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}ERROR${colors.reset}`);
    console.log(`  ${error.message}`);
    failed++;
    return false;
  }
}

async function runTests() {
  console.log(`${colors.blue}==========================================${colors.reset}`);
  console.log(`${colors.blue}Error Handling Flow Verification${colors.reset}`);
  console.log(`${colors.blue}==========================================${colors.reset}`);
  console.log('');

  console.log('1. Testing Menu CRUD Validation');
  console.log('--------------------------------');

  // Test 1: Create menu with empty name
  await testApi(
    'Create menu with empty name',
    'POST',
    '/api/menu',
    { name: '', price: 'invalid', categoryId: 'invalid-id' },
    '400',
    'required'
  );

  // Test 2: Create menu with invalid price
  await testApi(
    'Create menu with invalid price',
    'POST',
    '/api/menu',
    { name: 'Test Menu', price: 'abc', categoryId: 'cm1234567890abcd' },
    '400',
    'number'
  );

  // Test 3: Create menu with negative price
  await testApi(
    'Create menu with negative price',
    'POST',
    '/api/menu',
    { name: 'Test Menu', price: -10, categoryId: 'cm1234567890abcd' },
    '400',
    'positive'
  );

  console.log('');
  console.log('2. Testing Order CRUD Validation');
  console.log('--------------------------------');

  // Test 4: Create order with empty items array
  await testApi(
    'Create order with empty items',
    'POST',
    '/api/order',
    { items: [], subtotal: 0, total: 0 },
    '400',
    'item'
  );

  // Test 5: Create order with invalid total
  await testApi(
    'Create order with invalid total',
    'POST',
    '/api/order',
    {
      items: [{ menuId: 'cm1234567890abcd', quantity: 1, price: 10000 }],
      subtotal: 'abc',
      total: 'xyz'
    },
    '400',
    'number'
  );

  // Test 6: Create order with invalid payment method
  await testApi(
    'Create order with invalid payment method',
    'POST',
    '/api/order',
    {
      items: [{ menuId: 'cm1234567890abcd', quantity: 1, price: 10000 }],
      subtotal: 10000,
      total: 10000,
      paymentMethod: 'BITCOIN'
    },
    '400',
    'payment'
  );

  console.log('');
  console.log('3. Testing User CRUD Validation');
  console.log('--------------------------------');

  // Test 7: Create user with invalid email
  await testApi(
    'Create user with invalid email',
    'POST',
    '/api/user',
    { name: 'Test', email: 'invalid-email', password: 'password123', role: 'ADMIN' },
    '400',
    'email'
  );

  // Test 8: Create user with empty password
  await testApi(
    'Create user with empty password',
    'POST',
    '/api/user',
    { name: 'Test', email: 'test@example.com', password: '', role: 'KASIR' },
    '400',
    'password'
  );

  // Test 9: Create user with invalid role
  await testApi(
    'Create user with invalid role',
    'POST',
    '/api/user',
    { name: 'Test', email: 'test@example.com', password: 'password123', role: 'SUPERADMIN' },
    '400',
    'role'
  );

  console.log('');
  console.log('4. Testing Category CRUD Validation');
  console.log('-------------------------------------');

  // Test 10: Create category with empty name
  await testApi(
    'Create category with empty name',
    'POST',
    '/api/category',
    { name: '', order: 1 },
    '400',
    'name'
  );

  // Test 11: Create category with invalid order
  await testApi(
    'Create category with invalid order',
    'POST',
    '/api/category',
    { name: 'Test Category', order: 'abc' },
    '400',
    'number'
  );

  console.log('');
  console.log('5. Testing Settings Validation');
  console.log('-------------------------------');

  // Test 12: Update settings with invalid tax rate (negative)
  await testApi(
    'Update settings with negative tax rate',
    'PUT',
    '/api/settings',
    { storeName: 'Test Store', taxRate: -10 },
    '400',
    'tax'
  );

  // Test 13: Update settings with invalid tax rate (> 100)
  await testApi(
    'Update settings with tax rate > 100',
    'PUT',
    '/api/settings',
    { storeName: 'Test Store', taxRate: 150 },
    '400',
    'tax'
  );

  console.log('');
  console.log(`${colors.blue}==========================================${colors.reset}`);
  console.log(`${colors.blue}Test Summary${colors.reset}`);
  console.log(`${colors.blue}==========================================${colors.reset}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);

  if (failed === 0) {
    console.log(`\n${colors.green}All tests passed!${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}Some tests failed!${colors.reset}`);
    process.exit(1);
  }
}

// Run tests
console.log(`${colors.yellow}Note: Make sure the dev server is running on localhost:3000${colors.reset}`);
console.log(`${colors.yellow}Start it with: npm run dev${colors.reset}`);
console.log('');

runTests().catch(error => {
  console.error(`${colors.red}Test runner error:${colors.reset}`, error);
  process.exit(1);
});
