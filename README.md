# House of Refuge — Web Application

A React + Vite frontend for the House of Refuge Drug Rehabilitation Centre, Lagos.

## Tech stack
- React 18 + React Router v6
- Vite 5 (build tool)
- CSS Modules (scoped styles per component)
- Paystack Inline JS (payments)

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Set your Paystack key
cp .env.example .env
# Edit .env → set VITE_PAYSTACK_KEY=pk_live_YOURKEY

# 3. Run dev server
npm run dev
# → http://localhost:3000

# 4. Build for production
npm run build
# Output in /dist — deploy to Netlify, Vercel, cPanel etc.
```

---

## Pages

| Route      | Page                                         |
|------------|----------------------------------------------|
| `/`        | Home — hero, mission, steps, equipment drive |
| `/about`   | About — Freedom Foundation, values, team     |
| `/donate`  | Donate — amounts, frequency, Paystack        |
| `/sponsor` | Sponsor — 32 items grid, filter, Paystack    |
| `/apply`   | Waitlist — admission form, ₦50k deposit      |
| `/contact` | Contact — message form, bank details         |

---

## Paystack configuration

All payment calls go through `src/utils/paystack.js`.
- Set `VITE_PAYSTACK_KEY` in `.env` to your live public key
- The `pay()` helper wraps `PaystackPop.setup()` — amounts are in **kobo** (multiply ₦ × 100)
- Webhook handling (server-side verification) is **not** included in this MVP — add a backend or use Paystack's dashboard notifications

---

## CookedIndoors integration

The patient portal (Phase 3) will connect to `https://cookedindoors.com` for meal ordering.
Currently referenced in the Waitlist sidebar as a link — full API integration is Phase 3.

---

## Environment variables

| Variable            | Description                    |
|---------------------|--------------------------------|
| `VITE_PAYSTACK_KEY` | Paystack public key (required) |

---

## Deployment (Netlify)

```bash
npm run build
# Drag /dist folder into Netlify, or connect your repo
# Set environment variable VITE_PAYSTACK_KEY in Netlify dashboard
```

Add a `_redirects` file in `/public`:
```
/* /index.html 200
```
This ensures React Router works on page refresh.

---

## Project structure

```
src/
├── main.jsx              Entry point
├── App.jsx               Router + NotifContext + ModalContext
├── styles/global.css     Design tokens + shared classes
├── data/items.js         All 32 sponsor items
├── utils/paystack.js     Payment helper
├── components/
│   ├── Nav               Sticky nav + mobile menu
│   ├── Footer            Footer with links
│   ├── Notification      Toast notifications
│   └── SponsorModal      Paystack modal for item sponsorship
└── pages/
    ├── Home              Landing page
    ├── About             About / values
    ├── Donate            Donation form
    ├── Sponsor           Equipment grid
    ├── Waitlist          Admission application
    └── Contact           Contact form
```

---

*House of Refuge · A Freedom Foundation Initiative · Managed by ConsultForAfrica*
