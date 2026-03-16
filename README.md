# AfriScout

AfriFoundry field data collection PWA. Offline-first. Phone only.

**Live at:** collector.afrifoundry.com

## Structure

```
afriscout/
├── client/   React + Vite PWA (frontend)
└── server/   Express + Neon API (backend)
```

## Deploy

### Server → Render

1. Create new Web Service on render.com
2. Connect this GitHub repo
3. Root directory: `server`
4. Build command: `npm install`
5. Start command: `npm start`
6. Add environment variables:
   - `DATABASE_URL` — your Neon connection string
   - `JWT_SECRET` — strong random string
   - `ADMIN_KEY` — key to create scout accounts
   - `CLIENT_URL` — https://collector.afrifoundry.com

### Client → Vercel

1. Import repo on vercel.com
2. Root directory: `client`
3. Build command: `npm run build`
4. Add environment variable:
   - `VITE_API_URL` — https://afriscout-api.onrender.com
5. Add domain: collector.afrifoundry.com

## Create first scout account

Once API is live, POST to `/auth/register` with header `x-admin-key: YOUR_ADMIN_KEY`:

```json
{
  "name": "Mark Gakuya",
  "email": "mark@afrifoundry.com",
  "password": "your-password",
  "zone": "Mombasa"
}
```

## Local development

```bash
npm install
cd client && npm install
cd ../server && npm install
cd .. && npm run dev
```

---

*AfriFoundry · Built in Kenya · Built for Africa*
