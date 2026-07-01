# DaikinTrack — Project Overview

## What it is
**DaikinTrack** is a web-based inventory and logistics management system for a
multi-branch warehouse/distribution network. It tracks stock in real time across
branches, manages purchase and sales invoices with per-unit serial-number
traceability, and includes a specialized **CopperScan** module for measuring
copper wire coils from a photograph.

## Tech stack
- **Framework:** React 19 + React Router 7
- **Build:** Vite
- **Styling:** Tailwind CSS 4, Framer Motion (animations), Lucide icons
- **Key libraries:** html5-qrcode (barcode/QR scanning), jsPDF (invoice PDFs),
  Recharts (charts)
- **Data:** REST API backend; `localStorage` holds only the auth token and the
  cached user session.

## User roles
The app is role-based with three roles (route-protected via `ProtectedRoute`):

| Role | Scope | Main capabilities |
|------|-------|-------------------|
| **Admin** | All branches | Manage users, branches, categories, products; view ledger, history, reports |
| **Store Manager** | Own branch (read-only view of others) | Check In/Out scanning, stock management, purchase & sales invoices, quarantine/returns, suppliers, customers, copper scan |
| **Distributor** | All branches | Reporting: stock ledger, purchase/sales registers, outstanding stock |

**Auth flow:** credential login → JWT token stored in `localStorage` → Bearer
token on API requests; a 401 clears the token and forces re-login.

## Main features
- **Dashboards** — system-wide (admin/distributor) and operational, branch-scoped
  with low-stock alerts (store manager).
- **Check In / Out** — QR/barcode scanning to receive or dispatch stock, which
  opens purchase/sales invoice forms.
- **Invoices** — Purchase (supplier → warehouse) and Sales (warehouse → customer);
  each unit gets a unique serial number; export to PDF.
- **Manage Stock** — product catalog per branch with purchased/sold/available
  quantities and stock status.
- **Inventory Ledger & Product History** — full movement trail and per-product
  traceability across the network.
- **Quarantine & Returns** — handle damaged/defective stock.
- **Suppliers & Customers** — organization-wide party management.
- **CopperScan** — image-based coil measurement using an A4 sheet or ₹10 coin for
  calibration; computes wire gauge, length, and weight; with history and analytics.
- **Reports** — multi-tab registers with date filtering.

## Project structure (`src/`)
```
src/
├── App.jsx              # Routes + role-based redirects
├── main.jsx             # Entry point, context providers
├── context/             # Auth, Admin, Inventory, Invoice, Party, Reports, CopperScan
├── pages/               # admin/ · manager/ · distributor/ · copper/ · Login
├── components/          # layout, invoices, products, parties, scan, charts, copper, ui
├── lib/                 # api.js (REST client + mappers), copper.js (wire math)
├── routes/              # ProtectedRoute (role-based access)
├── hooks/ · utils/      # state hooks, formatting, invoice/report helpers
└── assets/              # logos, backgrounds
```

## Notable architecture
- **Role-aware UI** — navigation and features adapt to the logged-in role.
- **Branch scoping** — managers default to their branch with a read-only "Switch
  Branch" view; admins/distributors see everything.
- **Serial tracking** — every invoiced unit carries a unique serial for full
  traceability.
- **Slug-based keys** — the frontend uses readable slugs (e.g. `north`,
  `electronics`) and maps them to backend integer IDs in `lib/api.js`.
- **Mobile-first** — responsive layout with a bottom nav and animated transitions.
