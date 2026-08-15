# ROUTING.md — URL Structure & Deep Linking

## Route Structure

```
/                                   → IndexPage (desk selector)
/lms                                → Redirect to /lms/front-desk
/lms/front-desk                     → FrontDeskPage (default: leads tab)
/lms/school-desk                    → SchoolDeskPage
/lms/office-desk                    → OfficeDeskPage (redirect to /leads)
/lms/office-desk/leads              → LeadList (active leads)
/lms/office-desk/leads/:leadId      → LeadDetail
/lms/office-desk/invoices           → InvoiceList
/lms/office-desk/invoices/:invoiceId → InvoiceDetail
/lms/office-desk/billing            → SubscriptionManager
/lms/office-desk/reports            → ArchiveReport
/lms/office-desk/settings           → OfficeDeskSettings
/parent-portal                      → ParentPortalPage
*                                   → 404 NotFoundPage
```

## URL Patterns

### Office Desk
| URL | Component | Description |
|-----|-----------|-------------|
| `/lms/office-desk` | Redirect | → `/lms/office-desk/leads` |
| `/lms/office-desk/leads` | LeadList | Active leads with filters |
| `/lms/office-desk/leads/:leadId` | LeadDetail | Single lead view |
| `/lms/office-desk/invoices` | InvoiceList | All invoices |
| `/lms/office-desk/invoices/:invoiceId` | InvoiceDetail | Single invoice view |
| `/lms/office-desk/billing` | SubscriptionManager | Subscription plans |
| `/lms/office-desk/reports` | ArchiveReport | Archive statistics |
| `/lms/office-desk/settings` | OfficeDeskSettings | Desk configuration |

### Query Parameters (Optional)
- `?search=term` — Pre-fill search box
- `?status=qualified` — Filter by status
- `?sort=created_at` — Sort field
- `?order=desc` — Sort order
- `?view=archived` — Show archived leads

## Deep Linking

### Share URLs
Users can share direct links to any entity:
```
https://app.example.com/lms/office-desk/leads/abc-123
https://app.example.com/lms/office-desk/invoices/inv-456
```

### URL State Persistence
- Page refresh preserves route context
- Back/forward browser navigation works
- Scroll position restored on back navigation

## Navigation Guards

### Desk Access Validation
- Validate `desk_id` exists and user has access via RLS
- Invalid desk → redirect to `/lms/office-desk`
- Invalid lead/invoice → show 404 or redirect to list

### Role-Based Routes
- `office` role: Full access to office desk
- `admin` role: Full access to all desks
- `front_desk` role: Redirect to front desk

## Components

### useDesk()
Returns `{ deskId }` from URL params.

### useLead()
Returns `{ deskId, leadId }` from URL params.

### useInvoice()
Returns `{ deskId, invoiceId }` from URL params.

### useDeskTab()
Returns `{ deskId, tab }` from URL params, defaults to 'leads'.

### useNavigateTo()
Navigation helpers:
- `navigateToDesk(deskId)`
- `navigateToLead(deskId, leadId)`
- `navigateToInvoice(deskId, invoiceId)`
- `navigateToDeskTab(deskId, tab)`

### DeskBreadcrumb
Displays: Desks / Office Desk / Leads / Lead Name

### DeepLinkProvider
Context for sharing URLs and copying to clipboard.

### NavigationGuard
Validates access before rendering children.
