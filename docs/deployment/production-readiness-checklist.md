# Production Readiness Checklist — RhProject Landing Page

## Row 76: Domain Configuration

### Domain & DNS

- [ ] Domain registered in Cloudflare or pointed to Cloudflare nameservers
- [ ] CNAME record: `@` → `rhproject-landing.pages.dev`
- [ ] CNAME record: `www` → `rhproject-landing.pages.dev`
- [ ] MX record: `@` → `mail.protonmail.com` (priority 10)
- [ ] MX record: `@` → `mail.protonmail.ch` (priority 20)
- [ ] TXT record: `@` → `v=spf1 include:protonmail.com ~all`
- [ ] DNS propagation complete (check https://dnschecker.org/)

### SSL/TLS Security

- [ ] SSL/TLS mode: Full (Strict)
- [ ] Certificate: Cloudflare-managed (automatic renewal)
- [ ] Min TLS version: TLS 1.2
- [ ] HSTS enabled:
  - [ ] Max Age: 31536000 (1 year)
  - [ ] Include subdomains: ON
  - [ ] Preload: ON
  - [ ] No-Sniff: ON

### Cloudflare Pages

- [ ] Project created: `rhproject-landing`
- [ ] Git integration configured (GitHub repo connected)
- [ ] Build command: `npm run build --workspace=apps/landing`
- [ ] Build output: `apps/landing/.next`
- [ ] Custom domain added: `rhproject.com`
- [ ] Custom domain status: Active (green)

### Environment Variables

- [ ] `NEXT_PUBLIC_TURNSTILE_SITE_KEY` set in Cloudflare Pages
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set in Cloudflare Pages
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set in Cloudflare Pages
- [ ] `TURNSTILE_SECRET_KEY` set in Edge Function environment
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set in Edge Function environment

### Edge Function

- [ ] `/functions/api/leads.ts` deployed
- [ ] Turnstile verification working
- [ ] Supabase insert working
- [ ] CORS headers configured
- [ ] Error handling implemented

### Email Forwarding

- [ ] Email Routing enabled in Cloudflare
- [ ] Forwarding rule: `support@rhproject.com` → personal email
- [ ] Domain verification complete (TXT record added)
- [ ] Test email sent and received

### Security Rules

- [ ] Page Rule: Always Use HTTPS (`rhproject.com/*`)
- [ ] Page Rule: Cache Everything (`*rhproject.com/api/*`)
- [ ] CSP headers configured in `wrangler.toml`

### Domain Verification (Optional)

- [ ] Google Search Console: TXT record added and verified
- [ ] Bing Webmaster Tools: TXT record added and verified

### Testing

- [ ] https://rhproject.com loads correctly
- [ ] https://www.rhproject.com loads correctly
- [ ] http://rhproject.com redirects to https://rhproject.com
- [ ] SSL certificate valid (browser padlock visible)
- [ ] Lead form submits successfully
- [ ] Turnstile CAPTCHA works
- [ ] Supabase `website_leads` table updated
- [ ] Email forwarding works (send test email)

### Performance

- [ ] Static assets cached (check `cf-cache-status: HIT`)
- [ ] Core Web Vitals acceptable (Lighthouse 90+ score)
- [ ] Brotli compression enabled (Cloudflare default)

### Monitoring

- [ ] Cloudflare Analytics enabled
- [ ] Error alerts configured (optional)
- [ ] Uptime monitoring configured (optional)

---

## Sign-off

| Task | Owner | Date | Status |
|------|-------|------|--------|
| Domain configuration | Cece | [DATE] | [ ] |
| DNS records | Cece | [DATE] | [ ] |
| SSL/TLS setup | Cece | [DATE] | [ ] |
| Email forwarding | Cece | [DATE] | [ ] |
| Testing | Cece | [DATE] | [ ] |

**Notes:**
- All items must be checked before going live
- Keep backup DNS records in `docs/deployment/dns-records-template.txt`
- Document any issues or deviations in project logs
