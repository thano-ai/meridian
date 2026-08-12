# Meridian Business Suite

Single-process lab app (React UI + Express API on one port). Built for classroom / Burp Suite use.

> **Lab only** — do not expose to the public internet.

## Quick start (one app)

```bash
npm run setup
npm start
```

Open **http://localhost:4721** (use this URL in Burp’s browser too).

| Demo account | Password |
|--------------|----------|
| `alex.morgan@meridian.local` | `auditor123` |
| `admin@meridian.local` | `TempPass123` |

### What `setup` does
1. Installs backend + frontend dependencies  
2. Seeds the database  
3. Builds the UI into `frontend/dist` (served by Express)

### Day-to-day

```bash
npm start          # run UI+API on :4721
npm run build      # rebuild UI after frontend changes
npm run seed       # reset demo data
```

## Burp Suite

1. Intercept / use Burp browser  
2. Target **only** `http://localhost:4721`  
3. Same origin for pages and `/api/*` — no second port  
4. Watch `X-Vuln-Flag` and `X-Flag-Endpoint` on responses  
5. Hidden UI: `http://localhost:4721/hidden/flag-submit`

## Docker

```bash
docker-compose up --build
```

App: http://localhost:4721

## Scoring

- Flags rotate every minute (per student + vuln name + date + time)  
- Points count **only** after a valid submit on the hidden verification page  
- Progress: **Account** in the app  

## Discover the flag page

- Header: `X-Flag-Endpoint: /hidden/flag-submit`  
- `/config/app-settings.json`  
- `/dev/api-docs`  
- HTML source comments  

## Example findings

| ID | Where | Trigger |
|----|--------|---------|
| SQLI-001 | People search | `' OR 1=1--` |
| IDOR-001 | People detail | Open another employee |
| XSS-001 | Customers tickets | HTML in ticket body |
| LOGIC-001 | Shop | Custom unit price |
| TRAV-001 | Files | `../../config/app-settings.json` |
