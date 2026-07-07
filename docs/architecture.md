# Redhouse Architecture Overview

## Authorization & Access Control
See [Access & Authorization Specification](access-model.md) for the complete access model.

- Source of truth: Supabase
- Access grants are system-derived, not user-controlled
- Mobile app is read-only (bouncer + mirror)
- Office Desk is the only surface that can grant or restrict access
