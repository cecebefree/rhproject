.PHONY: setup types dev build-all test lint typecheck

setup:
	supabase start --exclude studio
	@echo "Supabase local stack running"

types:
	supabase gen types typescript --local > packages/shared/src/database.types.ts
	@echo "Types regenerated"

dev:
	pnpm dev

build-all:
	pnpm build

test:
	supabase test db

lint:
	biome check .

typecheck:
	tsc --noEmit
