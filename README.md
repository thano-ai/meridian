# Meridian Business Suite

Meridian is a single-process business application: a React UI and an Express API served together on **one port**. Students and testers can use a normal browser or Burp Suite against the same origin.

> **Lab use only.** Do not expose this application to the public internet.

---

## Requirements

Install these before setup:

| Tool | Version | Check |
|------|---------|--------|
| Node.js | 18 or newer (22 recommended) | `node -v` |
| npm | 9 or newer | `npm -v` |
| Git | any recent version | `git --version` |

Optional (only if you want containers):

- Docker Desktop
- Docker Compose

---

## 1. Clone the repository

```bash
git clone https://github.com/thano-ai/meridian.git
cd meridian
```

---

## 2. Install and prepare the app

From the project root (`meridian/`), run:

```bash
npm run setup
```

This single command:

1. Installs backend packages (`backend/`)
2. Installs frontend packages (`frontend/`)
3. Seeds the SQLite database with demo employees, products, customers, invoices, and more
4. Builds the React UI into `frontend/dist` so Express can serve it

If `setup` fails on Windows because native modules cannot compile, install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (C++ workload) and run `npm run setup` again.

### Manual equivalent (if you prefer step by step)

```bash
npm install --prefix backend
npm install --prefix frontend
npm run seed
npm run build
```

---

## 3. Run the application

```bash
npm start
```

Then open:

**http://localhost:4721**

UI and API are on the same origin. There is no separate frontend port.

Stop the server with `Ctrl+C`.

### First-time check

In a browser, open:

- App: http://localhost:4721
- Health: http://localhost:4721/api/health

You should see the Meridian sign-in page, and the health endpoint should return JSON with `"status":"ok"`.

---

## Demo accounts

| Role | Email | Password |
|------|--------|----------|
| Employee | `alex.morgan@meridian.local` | `auditor123` |
| Admin | `admin@meridian.local` | `TempPass123` |

You can also create a new account from **Create one** on the sign-in page.

---

## Day-to-day commands

Run these from the project root:

| Command | What it does |
|---------|----------------|
| `npm start` | Start UI + API on port **4721** |
| `npm run build` | Rebuild the frontend after UI code changes |
| `npm run seed` | Reset and re-populate the database |
| `npm run setup` | Full install + seed + build |
| `npm run docker:up` | Build and run with Docker Compose |

After changing frontend files, rebuild then restart:

```bash
npm run build
npm start
```

Backend-only changes only need a restart (`npm start`).

---

## Configuration

Copy `backend/.env.example` to `backend/.env` if you do not already have one.

Default settings:

```env
PORT=4721
JWT_SECRET=super-weak-jwt-secret-change-me
SECRET_SALT=vuln-biz-app-salt-2024
NODE_ENV=development
FRONTEND_URL=http://localhost:4721
```

The app listens on **4721** so it does not collide with common ports such as 3000, 8000, or 8080.

`.env` is gitignored. Do not commit secrets.

---

## Docker (optional)

```bash
docker-compose up --build
```

App URL: **http://localhost:4721**

Stop with `Ctrl+C`, or in another terminal:

```bash
docker-compose down
```

---

## Using Burp Suite

1. Start the app with `npm start`
2. In Burp, use the embedded browser (or set the system proxy)
3. Target **only** `http://localhost:4721`
4. Pages and `/api/*` share the same host and port
5. Watch response headers such as `X-Vuln-Flag` and `X-Flag-Endpoint`

Hidden verification page (not linked in the main navigation):

**http://localhost:4721/hidden/flag-submit**

Other discovery hints:

- Header: `X-Flag-Endpoint: /hidden/flag-submit`
- http://localhost:4721/config/app-settings.json
- http://localhost:4721/dev/api-docs
- HTML source comments

---

## Scoring (classroom / assessment)

- Flags are unique per student, vulnerability, date, and minute
- Flags rotate every minute — submit soon after you capture `X-Vuln-Flag`
- Points are awarded **only** after a valid flag is submitted
- Progress is shown under **Account** in the app

---

## Project layout

```text
meridian/
├── backend/          Express API, SQLite, flag scoring
├── frontend/         React + Vite UI (built into frontend/dist)
├── data/             Sample JSON snapshots
├── config/           Intentionally exposed config (lab)
├── backup/           Intentionally exposed backup (lab)
├── docker-compose.yml
└── package.json      Root scripts: setup, start, build, seed
```

---

## Troubleshooting

**Port already in use**  
Change `PORT` in `backend/.env`, then run `npm start` again.

**`frontend is not built` / 503 page**  
Run `npm run build`, then `npm start`.

**Empty database / demo login fails**  
Run `npm run seed`, then restart.

**`better-sqlite3` install error**  
Install Node.js 18+ and Windows C++ build tools, then run `npm run setup` again.

**UI looks old after a code change**  
Rebuild (`npm run build`) and restart (`npm start`). The production server serves `frontend/dist`, not the Vite dev server.

---

## Example findings (for testers)

| ID | Where | Trigger |
|----|--------|---------|
| SQLI-001 | People search | `' OR 1=1--` |
| IDOR-001 | People detail | Open another employee |
| XSS-001 | Customers tickets | HTML in ticket body |
| LOGIC-001 | Shop | Custom unit price |
| TRAV-001 | Files | `../../config/app-settings.json` |
