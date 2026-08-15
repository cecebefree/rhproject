# Row 76: Production Domain Configuration Guide

## Overview

This guide covers configuring a production domain (rhproject.com or custom domain) with Cloudflare, including SSL/TLS, DNS routing, email forwarding, and domain verification.

## Prerequisites

- Domain registered (Namecheap, GoDaddy, or transfer to Cloudflare Registrar)
- Cloudflare account active
- Row 42 (Cloudflare Pages) deployed and live

---

## 1. Domain Registration

### Option A: Transfer Domain to Cloudflare Registrar (Recommended)

1. Go to Cloudflare Dashboard → Registrar → Transfer domain
2. Follow transfer steps:
   - Get auth code from current registrar
   - Update nameservers to Cloudflare
   - Wait for transfer (1-7 days typically)

### Option B: Domain Already in Cloudflare

- Skip to DNS setup section

---

## 2. DNS Configuration

### Cloudflare Dashboard → Zones → Select your domain → DNS → Records

| Type | Name | Content | TTL | Proxy | Notes |
|------|------|---------|-----|-------|-------|
| CNAME | @ | rhproject-landing.pages.dev | Auto | Proxied (orange cloud) | Root domain → Cloudflare Pages |
| CNAME | www | rhproject-landing.pages.dev | Auto | Proxied | www subdomain → Cloudflare Pages |
| MX | @ | mail.protonmail.com | Auto | DNS only | Email routing (if using ProtonMail) |
| TXT | @ | v=spf1 include:protonmail.com ~all | Auto | DNS only | SPF record for email |

### Additional DNS Records (Optional)

| Type | Name | Content | TTL | Proxy | Notes |
|------|------|---------|-----|-------|-------|
| TXT | @ | google-site-verification=... | Auto | DNS only | Google Search Console verification |
| TXT | _dmarc | v=DMARC1; p=none; rua=mailto:dmarc@rhproject.com | Auto | DNS only | DMARC policy |

---

## 3. SSL/TLS Configuration

### Cloudflare Dashboard → SSL/TLS

| Setting | Value | Notes |
|---------|-------|-------|
| Mode | Full (Strict) | Origin supports HTTPS |
| Certificate | Cloudflare-managed | Automatic renewal |
| Min TLS Version | TLS 1.2 | Security best practice |

### Enable HSTS (HTTP Strict Transport Security)

1. Cloudflare Dashboard → SSL/TLS → Edge Certificates
2. Enable HSTS:
   - Max Age: 31536000 (1 year)
   - Include subdomains: ON
   - Preload: ON
   - No-Sniff: ON

---

## 4. Security Rules

### Cloudflare Dashboard → Rules → Page Rules

| Pattern | Setting | Value |
|---------|---------|-------|
| rhproject.com/* | Always Use HTTPS | On |
| *rhproject.com/api/* | Cache Level | Cache Everything |
| *rhproject.com/api/* | Edge Cache TTL | 1 hour |

---

## 5. Email Forwarding

### Cloudflare Dashboard → Email Routing

1. Add forwarding rule:
   - From: support@rhproject.com
   - To: your-personal-email@gmail.com (or team email)
2. Verify domain ownership (add TXT record if needed)
3. Test: Send email to support@rhproject.com, check personal inbox

---

## 6. Domain Verification

### Google Search Console

1. Go to Google Search Console → Add property
2. Enter domain: rhproject.com
3. Add TXT record to DNS:
   ```
   Type: TXT
   Name: @
   Content: google-site-verification=YOUR_VERIFICATION_CODE
   ```
4. Verify in Google Search Console

### Bing Webmaster Tools

1. Go to Bing Webmaster Tools → Add site
2. Enter domain: rhproject.com
3. Add TXT record to DNS:
   ```
   Type: TXT
   Name: @
   Content: ms=YOUR_VERIFICATION_CODE
   ```
4. Verify in Bing Webmaster Tools

---

## 7. Cloudflare Pages Custom Domain Link

### Cloudflare Dashboard → Pages → rhproject-landing project

1. Custom domains → Add custom domain
2. Enter: rhproject.com
3. Confirm DNS record (CNAME) is set correctly
4. Status should show "Active" (green)

---

## 8. Testing Checklist

### Domain & SSL

- [ ] https://rhproject.com loads correctly
- [ ] https://www.rhproject.com loads correctly
- [ ] http://rhproject.com redirects to https://rhproject.com
- [ ] SSL certificate is valid (browser padlock visible)
- [ ] HSTS headers present (check with curl -I)

### Email Forwarding

- [ ] Send email to support@rhproject.com
- [ ] Receive email in forwarded inbox
- [ ] Check SPF/DKIM records (mail-tester.com)

### Caching & Performance

- [ ] Check response headers for "cf-cache-status: HIT"
- [ ] Test static assets caching (images, CSS, JS)
- [ ] Run Lighthouse audit (aim for 90+ score)

### Lead Form

- [ ] Submit lead form with valid data
- [ ] Verify Turnstile CAPTCHA works
- [ ] Check Supabase website_leads table for new record
- [ ] Test error handling (invalid email, duplicate)

---

## 9. Production Readiness Checklist

- [ ] Domain registered in Cloudflare or pointed to Cloudflare nameservers
- [ ] DNS records (A, CNAME, MX, SPF, DKIM) configured
- [ ] SSL/TLS: Full (Strict) mode enabled
- [ ] HSTS enabled with preload
- [ ] Email forwarding set up and tested
- [ ] Cloudflare Pages custom domain linked
- [ ] Landing page loads over HTTPS
- [ ] Lead form (Turnstile + Supabase) works end-to-end
- [ ] Website analytics enabled
- [ ] Backup DNS records documented

---

## 10. Monitoring & Analytics

### Cloudflare Dashboard → Analytics

- Monitor traffic, bot traffic, caching performance
- Check Core Web Vitals (Cloudflare Insights)
- Set up alerts for errors/downtime (optional)

---

## 11. Backup DNS Records

Document these for disaster recovery:

```
; RhProject DNS Records
; Last updated: [DATE]

; A records (if needed for non-Cloudflare services)
@       A       192.0.2.1    ; Example IP

; CNAME records
@       CNAME   rhproject-landing.pages.dev
www     CNAME   rhproject-landing.pages.dev

; MX records (email)
@       MX      10  mail.protonmail.com
@       MX      20  mail.protonmail.ch

; TXT records
@       TXT     "v=spf1 include:protonmail.com ~all"
@       TXT     "google-site-verification=..."
_dmarc  TXT     "v=DMARC1; p=none; rua=mailto:dmarc@rhproject.com"
```

---

## Troubleshooting

### Domain Not Loading

1. Check DNS propagation: https://dnschecker.org/
2. Verify CNAME record points to correct Cloudflare Pages domain
3. Check Cloudflare Dashboard → SSL/TLS for certificate status

### SSL Certificate Issues

1. Wait 24 hours for certificate propagation
2. Check SSL/TLS mode is "Full (Strict)"
3. Verify origin server has valid SSL certificate

### Email Not Forwarding

1. Check MX records are correct
2. Verify Email Routing is enabled in Cloudflare
3. Check spam folder for forwarded emails

### Lead Form Not Working

1. Check Turnstile site key in environment variables
2. Verify Edge Function deployment in Cloudflare Pages
3. Check Supabase connection and RLS policies
