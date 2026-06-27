# Research: LMS Core

## Decisions Documented

No additional research required. All technical decisions were derived from:

1. **Constitution constraints**: TypeScript, Supabase, RLS-First, Type Safety
2. **tech-stack.md**: React 19, Vite 8, Tailwind CSS 4.3.1, Supabase client
3. **Feature specification**: User roles, sequential chapter locking, progress tracking

## Key Decisions

### Language & Framework
- **Decision**: TypeScript 6.0.2 with React 19 and Vite 8
- **Rationale**: Matches project tech-stack exactly. Provides type safety and modern React patterns.
- **Alternatives Considered**: None - this is the project standard.

### Database & Backend
- **Decision**: Supabase (PostgreSQL with RLS)
- **Rationale**: Constitution Principle V (RLS-First Security) mandates RLS. Supabase is the project standard backend per tech-stack.md.
- **Alternatives Considered**: None - Constitution requires RLS and Supabase is the project backend.

### Authentication
- **Decision**: Supabase Auth (email/password)
- **Rationale**: Standard Supabase integration. Spec requires email/password registration (FR-001, FR-002).
- **Alternatives Considered**: OAuth (not required by spec, adds complexity)

### State Management
- **Decision**: React Query (via @tanstack/react-query) with Supabase client
- **Rationale**: Standard pattern for React + Supabase projects. Handles caching, loading states, optimistic updates.
- **Alternatives Considered**: SWR, Zustand (but React Query is more common with Supabase)

### Form Handling
- **Decision**: React Hook Form + Zod
- **Rationale**: Type-safe validation, works well with Zod schemas already in packages/shared.
- **Alternatives Considered**: Formik (larger bundle), React Hook Form alone (less validation)

### Chapter Sequential Locking
- **Decision**: Client-side UI lock + Server-side validation via RLS/policy
- **Rationale**: Cannot rely solely on UI. Server must enforce that previous chapter is complete before allowing next. RLS policies will verify chapter_id is the next sequential incomplete chapter.
- **Alternatives Considered**: None - security requires server-side enforcement.

### Progress Tracking
- **Decision**: ChapterProgress table records completed_at when video reaches end
- **Rationale**: Completion = video played to end. Server records completion timestamp.
- **Alternatives Considered**: Time-based progress (unreliable), percentage-based (too granular)

### Payment Integration
- **Decision**: External Stripe integration (assumption documented)
- **Rationale**: Spec assumes payment gateway. Stripe is industry standard. Payment confirmation creates Enrollment record.
- **Alternatives Considered**: Other gateways (Stripe is most common)

## Dependencies

No new dependencies beyond project standards:
- @supabase/supabase-js (existing)
- @tanstack/react-query (standard with Supabase)
- react-hook-form (standard React form handling)
- zod (already in packages/shared)