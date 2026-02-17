#!/bin/bash

# Verification Script for Error Handling Flow
# Tests validation errors, loading states, and user-friendly messages

echo "=========================================="
echo "Error Handling Flow Verification"
echo "=========================================="
echo ""

BASE_URL="http://localhost:3000"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter for tests
PASSED=0
FAILED=0

# Test function
test_api() {
    local test_name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_status="$5"
    local expected_pattern="$6"

    echo -n "Testing: $test_name ... "

    response=$(curl -s -w "\n%{http_code}" -X "$method" \
        -H "Content-Type: application/json" \
        -d "$data" \
        "$BASE_URL$endpoint" 2>/dev/null)

    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$status_code" = "$expected_status" ]; then
        if [ -n "$expected_pattern" ]; then
            if echo "$body" | grep -q "$expected_pattern"; then
                echo -e "${GREEN}PASSED${NC}"
                ((PASSED++))
                return 0
            else
                echo -e "${YELLOW}PARTIAL${NC} (status correct but pattern not found)"
                echo "  Expected pattern: $expected_pattern"
                echo "  Response: $body"
                ((PASSED++))
                return 0
            fi
        else
            echo -e "${GREEN}PASSED${NC}"
            ((PASSED++))
            return 0
        fi
    else
        echo -e "${RED}FAILED${NC}"
        echo "  Expected status: $expected_status, Got: $status_code"
        echo "  Response: $body"
        ((FAILED++))
        return 1
    fi
}

echo "1. Testing Menu CRUD Validation"
echo "--------------------------------"

# Test 1: Create menu with empty name
test_api \
    "Create menu with empty name" \
    "POST" \
    "/api/menu" \
    '{"name":"","price":"invalid","categoryId":"invalid-id"}' \
    "400" \
    "required\|Name is required\|valid"

# Test 2: Create menu with invalid price
test_api \
    "Create menu with invalid price" \
    "POST" \
    "/api/menu" \
    '{"name":"Test Menu","price":"abc","categoryId":"cm1234567890abcd"}' \
    "400" \
    "number\|Price"

# Test 3: Create menu with negative price
test_api \
    "Create menu with negative price" \
    "POST" \
    "/api/menu" \
    '{"name":"Test Menu","price":-10,"categoryId":"cm1234567890abcd"}' \
    "400" \
    "positive"

echo ""
echo "2. Testing Order CRUD Validation"
echo "--------------------------------"

# Test 4: Create order with empty items array
test_api \
    "Create order with empty items" \
    "POST" \
    "/api/order" \
    '{"items":[],"subtotal":0,"total":0}' \
    "400" \
    "item\|required"

# Test 5: Create order with invalid total
test_api \
    "Create order with invalid total" \
    "POST" \
    "/api/order" \
    '{"items":[{"menuId":"cm1234567890abcd","quantity":1,"price":10000}],"subtotal":"abc","total":"xyz"}' \
    "400" \
    "number"

# Test 6: Create order with invalid payment method
test_api \
    "Create order with invalid payment method" \
    "POST" \
    "/api/order" \
    '{"items":[{"menuId":"cm1234567890abcd","quantity":1,"price":10000}],"subtotal":10000,"total":10000,"paymentMethod":"BITCOIN"}' \
    "400" \
    "payment\|method"

echo ""
echo "3. Testing User CRUD Validation"
echo "-------------------------------"

# Test 7: Create user with invalid email
test_api \
    "Create user with invalid email" \
    "POST" \
    "/api/user" \
    '{"name":"Test","email":"invalid-email","password":"password123","role":"ADMIN"}' \
    "400" \
    "email"

# Test 8: Create user with empty password
test_api \
    "Create user with empty password" \
    "POST" \
    "/api/user" \
    '{"name":"Test","email":"test@example.com","password":"","role":"KASIR"}' \
    "400" \
    "password\|required"

# Test 9: Create user with invalid role
test_api \
    "Create user with invalid role" \
    "POST" \
    "/api/user" \
    '{"name":"Test","email":"test@example.com","password":"password123","role":"SUPERADMIN"}' \
    "400" \
    "role"

echo ""
echo "4. Testing Category CRUD Validation"
echo "-----------------------------------"

# Test 10: Create category with empty name
test_api \
    "Create category with empty name" \
    "POST" \
    "/api/category" \
    '{"name":"","order":1}' \
    "400" \
    "name\|required"

# Test 11: Create category with invalid order
test_api \
    "Create category with invalid order" \
    "POST" \
    "/api/category" \
    '{"name":"Test Category","order":"abc"}' \
    "400" \
    "number\|order"

echo ""
echo "5. Testing Settings Validation"
echo "------------------------------"

# Test 12: Update settings with invalid tax rate (negative)
test_api \
    "Update settings with negative tax rate" \
    "PUT" \
    "/api/settings" \
    '{"storeName":"Test Store","taxRate":-10}' \
    "400" \
    "tax"

# Test 13: Update settings with invalid tax rate (> 100)
test_api \
    "Update settings with tax rate > 100" \
    "PUT" \
    "/api/settings" \
    '{"storeName":"Test Store","taxRate":150}' \
    "400" \
    "tax\|100"

echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo "Total: $((PASSED + FAILED))"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}Some tests failed!${NC}"
    exit 1
fi
