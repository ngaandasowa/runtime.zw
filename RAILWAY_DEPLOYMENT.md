# Railway Deployment Guide

## Why Railway > Vercel for Your Setup

Railway is **better than Vercel** for your architecture because:

| Feature | Vercel Serverless | Railway Continuous |
|---------|------|----------|
| **Backend Type** | Requires refactor to serverless | ✅ Runs Express as-is |
| **Cold Starts** | 1-3s initial requests | ✅ Instant (always running) |
| **Database Access** | Limited connection pooling | ✅ Full connection pools |
| **Long Queries** | 10s timeout (free) | ✅ No function timeout |
| **Cost** | $0 (free), scales quickly | ✅ $5/mo (includes DB) |
| **Setup** | Moderate refactoring | ✅ Simple, no changes needed |

---

## Quick Setup (10 minutes)

### 1. Prerequisites
- GitHub account with code pushed
- Firebase service account key
- Railway account (sign up at railway.app)

### 2. Add Environment Variables to Your Code

Create `.env.production` in your root (don't commit this):
```
PORT=3000
NODE_ENV=production
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
VITE_API_BASE_URL=https://your-railway-backend.up.railway.app/api
```

Or add to Railway dashboard (recommended).

### 3. Deploy on Railway

**Option A: Railway CLI (Fastest)**
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

**Option B: Railway Dashboard**
1. Go to railway.app → New Project
2. Select "Deploy from GitHub"
3. Choose your repository
4. Add environment variables (see step 2)
5. Click Deploy

### 4. Get Your Backend URL

Railway will give you a URL like:
```
https://your-project-production-xxx.up.railway.app
```

### 5. Update Frontend API URL

Your frontend will auto-detect (see `AnalyticsRepository.ts`):
- Dev: `http://localhost:4000/api`
- Prod: `{window.location.origin}/api`

If you need manual override, set `VITE_API_BASE_URL` in `.env.production`.

---

## Deployment Architecture

```
┌─────────────────────────────────────────┐
│        Railway Project (Single)         │
├─────────────────────────────────────────┤
│ ┌────────────────────────────────────┐  │
│ │   Backend Service (Node.js)        │  │
│ │  - Express server on port 3000     │  │
│ │  - Runs: npm run build:backend &&  │  │
│ │          npm run start:backend     │  │
│ │                                    │  │
│ │  Endpoints:                        │  │
│ │  - GET  /api/analytics             │  │
│ │  - GET  /api/analytics/conversion  │  │
│ │  - GET  /api/analytics/user/:id    │  │
│ │  - POST /api/analytics/event       │  │
│ └────────────────────────────────────┘  │
│                                         │
│ ┌────────────────────────────────────┐  │
│ │   PostgreSQL Database (Optional)   │  │
│ │  - For storing user/domain data    │  │
│ │  - Railway includes free tier      │  │
│ └────────────────────────────────────┘  │
└─────────────────────────────────────────┘
         ↕ https://your-url.up.railway.app
┌──────────────────────────────────────────┐
│   Frontend (Vercel / Netlify / etc)      │
│  - Vite build output                     │
│  - Calls backend at /api/analytics       │
└──────────────────────────────────────────┘
         ↓ firebase.com
┌──────────────────────────────────────────┐
│   Firebase (Firestore + Auth)            │
│  - Analytics events storage              │
│  - User authentication                   │
└──────────────────────────────────────────┘
```

---

## Environment Variables Needed

Add these in Railway Dashboard → Variables:

### Required (Firebase)
```
FIREBASE_SERVICE_ACCOUNT_JSON
  Value: Copy entire JSON from Firebase Console → Settings → Service Accounts → Generate New Key
  
FIREBASE_DATABASE_URL
  Value: https://your-project.firebaseio.com
```

### Optional (Backend)
```
PORT=3000
NODE_ENV=production
```

### Optional (Frontend - if custom)
```
VITE_API_BASE_URL=https://your-railway-backend.up.railway.app/api
```

---

## File Changes Summary

### Created
- ✅ `railway.json` - Railway deployment config

### Updated
- ✅ `package.json` - Added `start:backend` script
- ✅ `backend/server.ts` - Listens on port from env or 4000
- ✅ `src/services/AnalyticsRepository.ts` - Auto-detects API URL

### No Changes Needed
- ✅ Backend code works as-is
- ✅ Frontend works as-is
- ✅ Analytics tracking works as-is

---

## Testing After Deployment

### Test 1: Backend Health Check
```bash
curl https://your-project-production-xxx.up.railway.app/api/analytics
# Should return JSON with analytics data
```

### Test 2: Generate Real Data
1. Visit your frontend
2. Sign in with a test account
3. Navigate to different pages
4. Wait 1-2 minutes
5. Check Admin → Analytics dashboard

### Test 3: Check Logs
In Railway Dashboard:
- Click your project
- Select "Logs" tab
- Should see Express server logs like:
  ```
  Server running on port 3000
  ```

---

## Troubleshooting

### "Module not found" errors
**Issue**: Backend not compiled
**Fix**: Railway automatically runs `npm run build:backend` before `start:backend`
- Check railway.json has correct build command
- Verify `tsconfig.backend.json` exists

### Firebase credentials error
**Issue**: `FIREBASE_SERVICE_ACCOUNT_JSON` not set correctly
**Fix**: 
- Make sure you pasted the ENTIRE JSON (not just filename)
- Verify it's valid JSON: `https://jsonlint.com/`
- In Railway Dashboard, show value should start with `{"type":"service_account"`

### Analytics showing 0 data
**Issue**: Events not logging
**Fix**:
- Analytics only shows after real user activity
- Check Firebase Console → Firestore → `analytics_events` collection
- Should see documents being created
- May take 1-2 minutes to aggregate

### Request timeout errors
**Issue**: Backend taking >30s to respond
**Fix**:
- This is normal for cold start (first request after 15+ min idle)
- Subsequent requests will be instant
- If persistent, check Firebase query performance
- Optimize queries in `AnalyticsDataService.ts`

### CORS errors from frontend
**Issue**: "Access to XMLHttpRequest blocked by CORS"
**Fix**:
- Check backend has CORS enabled
- Backend should have: `app.use(cors());`
- Verify in `backend/server.ts`

---

## Cost & Scaling

### Pricing
- **Starter ($5/mo)**: Includes 5GB RAM, full DB support, 100GB bandwidth
- **Pro ($20/mo)**: Higher resource limits
- **Free Tier**: Limited to 500 hours/month (not recommended for production)

### Scaling Strategy
1. Start on Starter plan ($5/mo)
2. Monitor CPU/Memory in Railway Dashboard
3. If >80% usage, upgrade to Pro
4. For high traffic, add database read replicas

---

## Comparison: Railway vs Alternatives

| Platform | Cost | Setup | Cold Start | Best For |
|----------|------|-------|-----------|----------|
| **Railway** | $5/mo | 5 min | None | Your current setup ✅ |
| Vercel | Free (serverless only) | 10 min | 1-3s | Serverless, static sites |
| Render | $7/mo | 5 min | 30s | Similar to Railway |
| Heroku | $7/mo | 5 min | 5s | Deprecated (closing 2025) |
| AWS Lambda | Variable | 20 min | 2-5s | Enterprise scale |

---

## Next Steps

1. **Deploy**:
   - Push code: `git add . && git commit -m "Railway deployment" && git push`
   - Go to railway.app and connect GitHub
   - Add environment variables
   - Click Deploy

2. **Verify**:
   - Test API endpoint: `curl https://your-url/api/analytics`
   - Sign in and generate activity
   - Check admin dashboard for data

3. **Update Frontend** (if deployed elsewhere):
   - If frontend is on Vercel/Netlify, update `VITE_API_BASE_URL` to Railway backend URL
   - Or frontend auto-detects (same origin in production)

4. **Monitor**:
   - Check Railway Dashboard logs weekly
   - Monitor Firebase usage in Firebase Console
   - Set up uptime alerts (Railway has built-in)

---

## Support

**Railway Docs**: https://docs.railway.app
**Firebase Docs**: https://firebase.google.com/docs
**Issues?** Check logs in Railway Dashboard → Logs tab

Your analytics system is now production-ready! 🚀
