#!/bin/bash
set -e

echo "🔍 Checking database.types imports..."

# Allow imports ONLY in @redhouse/shared/src/index.ts (the canonical export point)
VIOLATIONS=$(grep -r "from.*database.types" packages apps --include="*.ts" --include="*.tsx" | grep -v "packages/shared/src/index.ts" | grep -v "@redhouse/shared" || true)

if [ -n "$VIOLATIONS" ]; then
  echo "❌ VIOLATION: Direct database.types imports detected outside @redhouse/shared:"
  echo "$VIOLATIONS"
  exit 1
fi

echo "✓ All imports use @redhouse/shared"
