# Supermarket Inventory & Accounting (UAE)

Production-grade MERN stack application for supermarket inventory and accounting with UAE VAT support, double-entry bookkeeping, and multi-company/multi-financial-year support.

## Tech Stack

- **Frontend:** React 18, TypeScript, React Router, Redux Toolkit, Material UI, React Hook Form
- **Backend:** Node.js, Express, TypeScript
- **Database:** MongoDB
- **Auth:** JWT, bcrypt, RBAC

## Quick Start (Web)

```bash
# Install all dependencies
npm run install:all

# Set environment variables (copy .env.example and edit)
# Backend: backend/.env
# Frontend: frontend/.env

# Run development (backend + frontend)
npm run dev
```

- Backend: http://localhost:5000
- Frontend: http://localhost:3000

## Electron Desktop App

```bash
# Install all dependencies
npm run install:all

# Run as Electron desktop app (backend + Electron frontend)
npm run electron:dev

# Build distributable packages
npm run electron:build:win    # Windows (NSIS installer)
npm run electron:build:mac    # macOS (DMG)
npm run electron:build:linux  # Linux (AppImage)
```

> **Note:** The backend server must be running (or started via `electron:dev`) for the app to connect to the API. Make sure MongoDB is also running.

## Default Login (after seed)

- **Admin:** username `admin`, password `Admin@123`
- Create Company and Financial Year first, then add Products and Opening Stock.

## Project Structure

```
supermarket-inventory/
├── backend/              # Express API (TypeScript)
│   └── src/
│       ├── config/
│       ├── models/
│       ├── routes/
│       ├── controllers/
│       ├── services/
│       ├── middlewares/
│       └── utils/
├── frontend/             # React SPA + Electron (TypeScript)
│   ├── electron/
│   │   ├── main.ts       # Electron main process
│   │   └── preload.ts    # Preload script (context bridge)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── store/
│   │   ├── services/
│   │   └── layouts/
│   ├── electron-builder.yml  # Packaging config
│   └── vite.config.ts
└── README.md
```

## UAE VAT

- Default VAT 5%; zero-rated and exempt categories configurable per company.
- TRN (Tax Registration Number) for company and B2B customers/suppliers.
- Invoice and VAT summaries suitable for UAE FTA.

## License

Proprietary.
