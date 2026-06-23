# Red House School Digital Portal - Rapid Implementation Plan

## Vision
Build the world's premier online Cambridge school portal — high-tech, socially integrated, values-aligned — targeting 150+ student registrations from affluent, Christian-aligned families.

---

## Accelerated Phase Overview (Eyes on Site in Hours)

| Phase | Focus | Timeline | Status |
|-------|-------|----------|--------|
| **0** | **Ultra-MVP: Home Page Live** | **Hours** (single session) | 📋 **START HERE** |
| **1** | Full Home Page (10 sections) + Mega Menu | Day 1-2 | ⏳ |
| **2** | About (Declaration of Faith) + Campaign Landing | Day 2-3 | ⏳ |
| **3** | Registration Forms + HubSpot CRM | Day 3-4 | ⏳ |
| **4** | Core & Sup Pages + CSV Import (subjects, pricing) | Day 4-5 | ⏳ |
| **5** | Info Section (Blog, FAQ, KB) + SEO | Day 5-6 | ⏳ |
| **6** | RedEstore + AI Chatbot + CRM Automation | Week 2 | 🔮 |
| **7** | LMS & iOS App (separate: lms.redhouse.school) | Future | 🔮 |

---

## Phase 0: Ultra-MVP (Deploy Home Page TODAY)

### Goal: Single-page home with hero, 3 pillars, CTA — deployed to Netlify in **one session**

### What Goes Live
- **Hero** — Full-screen, headline, dual CTA (Register / Schedule Visit)
- **Three Pillars** — Academic Excellence, Pastoral Care, Global Community
- **Final CTA** — Three buttons: Register Child, Apply to Teach, Book Visit
- **Header** — Logo, mega menu scaffold (desktop + mobile)
- **Footer** — 4 columns, newsletter signup
- **GA4** — Tracking from day 1
- **All 26 routes** — Scaffolded as placeholder pages

### Base44 Assets (Use for Ultra-MVP)
| Asset | URL |
|-------|-----|
| Logo | `https://media.base44.com/images/public/69f23a2b0bbaf081e75813b0/7f4474889_logo.png` |
| OG Image | `https://media.base44.com/images/public/69f23a2b0bbaf081e75813b0/7f4474889_logo.png/v1/fill/w_1200,h_630/7f4474889_logo.png` |
| Hero BG | Extract from Base44 build (I'll fetch) |
| Section Images | Extract from Base44 build (I'll fetch) |

**Your custom photos swap in later** — no blocker.

---

## Unified Design System (Marketing Site — LMS Fonts for Now)

### Color Palette (Merged Marketing + LMS)

| Token | Hex | Usage |
|-------|-----|-------|
| **Primary Navy** | `#1a2330` | Header, footer, primary headings |
| **Primary Navy Light** | `#273946` | Hover, borders, active nav |
| **Burgundy Accent** | `#8b1a2e` | Primary CTAs, key actions |
| **Burgundy Bright** | `#c8281e` | Hover/focus, urgency |
| **Champagne Gold** | `#c9a227` | Subtitles (Caveat), decorative lines |
| **Champagne Light** | `#e8a020` | Highlights, accents |
| **Warm Ivory** | `#f8f7f4` | Page background, cards |
| **Parchment** | `#e8e4dc` | Alt sections (LMS color) |
| **Charcoal Text** | `#1c1c1e` | Body copy |
| **Muted Text** | `#6b6b6b` | Labels, timestamps |

**10 colors total — clean subset for LMS compatibility.**

### Typography (LMS Current — Swappable)

| Role | Font | Weights | Usage |
|------|------|---------|-------|
| **Serif Headlines** | **Cormorant Garamond** | 400, 600 | Hero, section titles, major headings |
| **Display Subtitles** | **Caveat** | 700 | Section subtitles (Champagne Gold) |
| **Sans UI** | **DM Sans** | 300, 400, 500 | All UI text, body, buttons, forms |

**Alternative (Master Plan) — ready to swap:**
- Playfair Display (400, 600) + Lato (300, 400, 700, 900)
- Toggle via Tailwind config variable

---

## Free Accounts Needed (Create in Parallel)

| Priority | Account | Why | Time |
|----------|---------|-----|------|
| **1** | **Netlify** | Hosting + CI/CD | 2 min |
| **2** | **GA4** | Analytics | 3 min |
| **3** | **HubSpot Free** | CRM + Forms + Meetings | 5 min |

**Create these 3 now.** Rest (Web3Forms, Brevo, Botpress, Cloudinary) → add in Phase 1-2.

---

## Ultra-MVP Implementation (Single Session)

### Prerequisites (You Do Now)
- [x] Netlify account → connect GitHub
- [x] GA4 property → `G-N25NYZHMSX`
- [x] HubSpot free CRM → `148502252`

### What I Build (When You Say "Go")
```
1. npm create vite@latest . -- --template react-ts
2. npm i tailwindcss @tailwindcss/vite react-router-dom lucide-react
3. Configure Tailwind with unified design tokens
4. Build: Header, MegaMenu, Footer, Hero, ThreePillars, FinalCTA
5. Add GA4 gtag hook (G-N25NYZHMSX)
6. Add JSON-LD (Organization, WebSite)
7. Deploy to Netlify (auto from GitHub push)
8. Share live URL → you review look/feel
```

**Time: ~2-3 hours from "go" to live URL.**

---

## Rapid Iteration Cycle (After Ultra-MVP)

| Cycle | Add | Review | Deploy |
|-------|-----|--------|--------|
| 1 | Full home page (10 sections) | You approve design | Netlify auto |
| 2 | About page + Declaration of Faith | You approve content | Netlify auto |
| 3 | Registration form + HubSpot | You test submit | Netlify auto |
| 4 | Core pages + CSV data | You verify subjects/pricing | Netlify auto |
| 5 | Blog + FAQ + SEO | You approve articles | Netlify auto |
| 6 | RedEstore + Chatbot + Automation | You approve flows | Netlify auto |

**Each cycle: hours, not days. Netlify auto-deploys on every push.**

---

## Menu Hierarchy (26 Routes - All Scaffolded)

```
HOME          → /
CORE
  Cambridge   → /cambridge-curriculum
  IB          → /ib-curriculum
  Home School → /homeschool
SUP
  Devotional  → /sup/devotional
  Enrichment  → /sup/enrichment
  Clubs       → /sup/clubs
  Music & Art → /sup/music-art
SOCIAL
  Life Events     → /social/life-events
  Student Council → /social/student-council
  Students        → /social/students
  Families        → /social/families
  Alumni          → /social/alumni
  Travel          → /social/travel-outings
SERVICES
  Experts     → /services/experts
  University  → /services/university
REDESTORE (later)
INFO
  About           → /about
  Registration    → /registration
  Pricing         → /pricing
  Zones Calendar  → /zones-calendar
  FAQ             → /faq
  Knowledge Base  → /knowledge-base
  Blog            → /blog
  Careers         → /careers
    School Board  → /careers#board
CONTACT
  Main Contact      → /main-contact
  Enrolment Meeting → /schedule-meeting
```

---

## HubSpot Meetings (Not Calendly)
- Built into free HubSpot CRM
- Create meeting types: "Virtual Tour", "Campus Visit", "Admissions Call"
- Embed in `/schedule-meeting` page
- Auto-creates contact, logs to timeline, triggers workflows

---

## CSV Data Structure (Paste When Ready)

### `subjects.csv`
```csv
curriculum,stage,subject,code,description,credits,exam_board
Cambridge,Primary,English,ENG001,English First Language,1,CAIE
Cambridge,Primary,Mathematics,MAT001,Mathematics,1,CAIE
Cambridge,Lower Secondary,Science,SCI001,Combined Science,1,CAIE
Cambridge,IGCSE,Biology,BIO001,Biology,1,CAIE
Cambridge,IGCSE,Chemistry,CHE001,Chemistry,1,CAIE
Cambridge,IGCSE,Physics,PHY001,Physics,1,CAIE
Cambridge,A-Level,Mathematics,MAT002,Pure Mathematics,1,CAIE
Cambridge,A-Level,Further Mathematics,FMAT001,Further Mathematics,1,CAIE
IB,PYP,Language,LAN001,Language and Literature,1,IBO
IB,MYP,Sciences,SCI002,Integrated Sciences,1,IBO
IB,DP,Biology HL,BIO002,Biology Higher Level,1,IBO
```

### `clubs.csv`
```csv
category,name,description,age_range,schedule,leader,capacity
Academic,Debate Society,Competitive debating,11-18,Thu 15:30,Mr. Smith,20
Academic,Model UN,UN simulation,13-18,Wed 15:30,Ms. Jones,25
STEM,Robotics Club,Robot building & coding,10-16,Tue 15:30,Dr. Brown,15
Creative,Orchestra,Full school orchestra,10-18,Mon/Fri 15:30,Mr. Davis,40
Creative,Theater Company,Productions & acting,12-18,Wed/Sat 15:30,Ms. Wilson,30
Sports,Rowing Club,River training & regattas,13-18,Daily 06:00,Coach Taylor,20
Service,Eco Council,Sustainability projects,10-18,Monthly,Ms. Green,15
```

### `pricing.csv`
```csv
curriculum,grade,annual_fee,term_fee,monthly_fee,deposit,notes
Cambridge,Primary,18000,6000,1500,5000,Includes materials
Cambridge,Lower Secondary,22000,7333,1833,5000,Includes lab access
Cambridge,IGCSE,28000,9333,2333,8000,Exam fees separate
Cambridge,A-Level,32000,10667,2667,8000,Exam fees separate
IB,PYP,25000,8333,2083,8000,Includes resources
IB,MYP,30000,10000,2500,8000,Includes personal project
IB,DP,35000,11667,2917,10000,Exam fees separate
Homeschool,All,15000,5000,1250,3000,Curriculum pack only
```

### `zones.csv`
```csv
zone_name,utc_offset,countries,term_dates
South Africa,UTC+2,"SA, Botswana, Lesotho","Jan-Dec (4 terms)"
UK/Europe,UTC+0,"UK, EU, Africa West","Sep-Jul (3 terms)"
Middle East,UTC+3,"UAE, Qatar, Saudi","Sep-Jun (3 terms)"
Asia Pacific,UTC+8,"SG, HK, AU, NZ","Jan-Dec (4 terms)"
Americas,UTC-5,"US East, CA, BR","Aug-May (2 semesters)"
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Time to first live page | <3 hours |
| Iteration cycle time | <4 hours |
| Lighthouse Performance | >90 |
| Lighthouse Accessibility | >95 |
| Lighthouse SEO | >90 |
| Registrations (90 days) | 150 |

---

## Ready to Build

**All prerequisites met:**
- Netlify + GitHub repo connected ✅
- GA4: `G-N25NYZHMSX` ✅
- HubSpot Portal ID: `148502252` ✅
- Repo: `https://github.com/cecebefree/rhproject.git` ✅

**Say "build" → I'll `/build` → scaffold → deploy → live URL in ~2 hours.**
