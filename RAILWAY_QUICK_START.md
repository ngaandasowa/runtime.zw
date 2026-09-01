# Railway Quick Start (5 Minutes)

## TL;DR - Deploy Entire Express Backend

Same as your Render deployment - all services in one Express server, now on Railway.

### 1. Get Firebase Credentials
- Firebase Console → Your Project → Settings → Service Accounts
- Click "Generate new private key" → Copy entire JSON content

### 2. Deploy to Railway (Choose One)

**Option A: CLI (Fastest)**
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

**Option B: Dashboard (Easiest)**
1. Go to `railway.app` → New Project
2. Select "Deploy from GitHub"
3. Choose your repository
4. Click "Add Variables" and add:
   ```
   FIREBASE_SERVICE_ACCOUNT_JSON = (paste entire JSON)
   FIREBASE_DATABASE_URL = https://your-project.firebaseio.com
   ```
5. Click Deploy

### 3. Get Your Backend URL
Railway shows URL like: `https://your-project-production-xxx.up.railway.app`

Your entire backend is live at:
```
https://your-project-production-xxx.up.railway.app
```

All services available:
- `GET /` - Health check
- `POST /api/email/*` - Email service
- `POST /api/payments/*` - Payment processing
- `POST /api/wallet/*` - Wallet management
- `POST /api/email-campaigns/*` - Email campaigns
- `POST /api/renewals/*` - Renewal lifecycle
- `GET /api/nameservers/*` - Nameserver management
- `GET /api/analytics/*` - Analytics

### 4. Done! 
Your entire backend is production-ready.

---

## Why Railway is Better

| vs Render | vs Vercel | vs Heroku |
|-----------|-----------|----------|
| ✅ No shutdown | ✅ No refactor needed | ✅ Still active |
| ✅ Included DB | ✅ Works with Express | ✅ Same price |
| ✅ 5x cheaper | ✅ Instant response | ✅ Better UX |

---

## Test Deployment

```bash
# After deploying, test the backend health check
curl https://your-project-production-xxx.up.railway.app

# Should return:
# {
#   "status": "ok",
#   "service": "Runtime API"
# }

# Test analytics endpoint
curl https://your-project-production-xxx.up.railway.app/api/analytics
```

---

## Your Backend Services (All Deployed)

1. **Email Service** - Send emails and manage templates
2. **Payment Processing** - Handle domain payments
3. **Wallet Management** - User wallet operations
4. **Email Campaigns** - Manage email campaigns
5. **Renewal Lifecycle** - Manage domain renewals
6. **Nameserver Management** - Nameserver operations
7. **Analytics** - Track user activity and page views

All services use the same Railway backend URL.

### Access Analytics Dashboard
1. Deploy frontend (Vercel, Netlify, etc.)
2. Sign in and navigate pages (generates events)
3. Admin → Analytics → View all metrics
4. See "Page Views Overview" card

---

## Environment Variables Checklist

Required:
- ✅ `FIREBASE_SERVICE_ACCOUNT_JSON` - Entire JSON from Firebase
- ✅ `FIREBASE_DATABASE_URL` - Your Firebase DB URL

Optional:
- `PORT` - Default 3000 (usually leave as-is)
- `NODE_ENV` - production

---

## Files Changed

- **railway.json** - NEW deployment config
- **package.json** - Added `start:backend` script
- Everything else works as-is!

---

## Troubleshooting

**Build failed?**
- Check logs in Railway Dashboard
- Verify `tsconfig.backend.json` exists
- Run locally: `npm run build:backend && npm run start:backend`

**Firebase error?**
- Make sure `FIREBASE_SERVICE_ACCOUNT_JSON` is complete JSON (not file path)
- Paste from Firebase Console, not a file

**No analytics data?**
- Analytics only appears after real user activity
- Sign in, navigate pages, wait 1-2 minutes
- Check Firestore Console for events

---

## Full Guide

See `RAILWAY_DEPLOYMENT.md` for detailed setup, architecture diagram, and advanced configuration.
