# 🚀 Start Backend Server Locally

## Quick Start

1. Open terminal in project root
2. Run: `npm run dev`
3. Server should start on port 5000
4. Check for errors in console

## Check if Server is Running

```bash
# Check if port 5000 is in use
netstat -ano | findstr :5000
```

## Common Errors & Fixes

### Error: "Cannot find module"
**Fix:** Run `npm install`

### Error: "Port already in use"
**Fix:** Kill the process or use different port
```bash
# Find process on port 5000
netstat -ano | findstr :5000
# Kill it (use PID from above)
taskkill /PID <PID> /F
```

### Error: "MongoDB connection failed"
**Fix:** Check .env file has correct MONGO_URI

### Error: "Cannot read property of undefined"
**Fix:** Check recent code changes for syntax errors

## Test Backend

Once server starts, test login endpoint:
```
POST http://localhost:5000/api/auth/login
Body: {
  "email": "your-email@example.com",
  "password": "your-password"
}
```

## Frontend Connection

Make sure frontend is pointing to correct backend:
- Local: `http://localhost:5000`
- Production: `https://crm-156r.onrender.com`

Check: `frontend/src/api/axios.js` → `baseURL`

