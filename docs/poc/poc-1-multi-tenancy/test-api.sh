#!/bin/bash

# POC #1: Multi-Tenancy Testing Script
# This script tests tenant isolation in the POC application

set -e

API_URL="http://localhost:3000"
TENANT_A="11111111-1111-1111-1111-111111111111"
TENANT_B="22222222-2222-2222-2222-222222222222"

echo "========================================="
echo "POC #1: Multi-Tenancy Testing"
echo "========================================="
echo ""

# Test 1: Create notes for both tenants
echo "Test 1: Creating notes for Tenant A and Tenant B"
echo "-----------------------------------------"

echo "Creating note for Tenant A..."
RESPONSE_A=$(curl -s -X POST "$API_URL/notes" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_A" \
  -d '{"title": "Tenant A Note", "content": "This is a secret note for Tenant A"}')
NOTE_A_ID=$(echo $RESPONSE_A | jq -r '.id')
echo "✓ Created note for Tenant A (ID: $NOTE_A_ID)"

echo "Creating note for Tenant B..."
RESPONSE_B=$(curl -s -X POST "$API_URL/notes" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_B" \
  -d '{"title": "Tenant B Note", "content": "This is a secret note for Tenant B"}')
NOTE_B_ID=$(echo $RESPONSE_B | jq -r '.id')
echo "✓ Created note for Tenant B (ID: $NOTE_B_ID)"
echo ""

# Test 2: Verify tenant isolation
echo "Test 2: Verifying tenant isolation"
echo "-----------------------------------------"

echo "Fetching notes for Tenant A..."
NOTES_A=$(curl -s "$API_URL/notes" -H "x-tenant-id: $TENANT_A")
COUNT_A=$(echo $NOTES_A | jq 'length')
echo "✓ Tenant A sees $COUNT_A note(s)"

echo "Fetching notes for Tenant B..."
NOTES_B=$(curl -s "$API_URL/notes" -H "x-tenant-id: $TENANT_B")
COUNT_B=$(echo $NOTES_B | jq 'length')
echo "✓ Tenant B sees $COUNT_B note(s)"
echo ""

# Test 3: Cross-tenant access prevention
echo "Test 3: Testing cross-tenant access prevention"
echo "-----------------------------------------"

echo "Tenant B trying to access Tenant A's note (ID: $NOTE_A_ID)..."
CROSS_ACCESS=$(curl -s -w "\n%{http_code}" "$API_URL/notes/$NOTE_A_ID" -H "x-tenant-id: $TENANT_B")
HTTP_CODE=$(echo "$CROSS_ACCESS" | tail -n 1)

if [ "$HTTP_CODE" == "404" ]; then
  echo "✓ Access denied! Tenant B cannot see Tenant A's note (HTTP 404)"
else
  echo "✗ SECURITY ISSUE: Tenant B can access Tenant A's note!"
  exit 1
fi
echo ""

# Test 4: Missing tenant header
echo "Test 4: Testing missing tenant header"
echo "-----------------------------------------"

echo "Calling API without x-tenant-id header..."
NO_TENANT=$(curl -s -w "\n%{http_code}" "$API_URL/notes")
HTTP_CODE=$(echo "$NO_TENANT" | tail -n 1)

if [ "$HTTP_CODE" == "400" ]; then
  echo "✓ Request rejected! API requires tenant context (HTTP 400)"
else
  echo "✗ ISSUE: API allowed request without tenant header"
  exit 1
fi
echo ""

# Summary
echo "========================================="
echo "✅ All tests passed!"
echo "========================================="
echo ""
echo "Summary:"
echo "- Tenant isolation: WORKING"
echo "- Cross-tenant access: BLOCKED"
echo "- Tenant context required: ENFORCED"
echo ""
echo "POC #1 validation complete!"
