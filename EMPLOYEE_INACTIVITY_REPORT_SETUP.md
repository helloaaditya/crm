# Employee Inactivity Report – Setup & Test

This feature sends a daily email to **kulalp447@gmail.com** listing employees who had **no check-in (no activity)** in the CRM for that day.

---

## 1. Environment (email)

**On Render (or any host that blocks SMTP):** Use **Resend** so email goes over HTTPS instead of SMTP.

In Render **Environment** tab, add:

```env
RESEND_API_KEY=re_xxxxxxxxxxxx
# Optional – defaults to "Sanjana CRM" <onboarding@resend.dev>
# EMAIL_FROM=Sanjana CRM <onboarding@resend.dev>
```

Get a key at [resend.com/api-keys](https://resend.com/api-keys). No other email vars needed when using Resend.

**Local / hosts that allow SMTP:** You can use Gmail instead:

```env
EMAIL_USER=your-sender@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_SERVICE=gmail
EMAIL_FROM="Sanjana CRM" <your-sender@gmail.com>
```

For Gmail, use an [App Password](https://myaccount.google.com/apppasswords) (2FA must be enabled).

---

## 2. What runs automatically (cron)

- **Schedule:** Every day at **7:00 PM** (19:00 server time).
- **Action:** Finds active employees with **no attendance check-in for that day** and sends the report to **kulalp447@gmail.com**.
- **File:** `utils/cronJobs.js` (job runs after server start when DB is connected).

No extra setup is needed for the cron; restart the server and it will run at 7 PM daily.

---

## 3. Test from command line

From the **project root** (backend folder if you run from there):

```bash
# Report for today
node scripts/test-employee-inactivity-report.js

# Report for a specific date
node scripts/test-employee-inactivity-report.js 2025-01-27
```

- Uses `MONGODB_URI` from `.env`.
- Sends the same email the cron would send (to kulalp447@gmail.com).
- Check inbox (and spam) at **kulalp447@gmail.com**.

---

## 4. Test via API (manual trigger)

The endpoint requires **login**. If you get **"Not authorized, no token"**, you must send a valid JWT.

### How to get the token

1. **Login** to your CRM (frontend or API):
   - **POST** `/api/auth/login` with body: `{ "email": "your-admin@email.com", "password": "yourpassword" }`
   - Response includes `token`. Copy that value.

2. **Use the token** in the request:
   - Header: `Authorization: Bearer <paste-the-token-here>`
   - No spaces inside the token; one space after `Bearer`.

### Example (admin user)

```bash
# 1) Login and copy token from response
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"yourpassword"}'

# 2) Use the token (replace YOUR_JWT_TOKEN with the token from step 1)
curl -X POST https://crm-1ej7.onrender.com/api/employees/inactivity-report/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Important:** Use **POST** with a tool (Postman, Insomnia, or browser console `fetch`). Do **not** paste the curl command into the browser address bar (that sends a GET and will fail).

**Postman / Insomnia:**

- **Method:** POST  
- **URL:** `https://crm-1ej7.onrender.com/api/employees/inactivity-report/send`  
- **Headers:** `Authorization` = `Bearer <token from login>`, `Content-Type` = `application/json`  
- **Body (optional):** `{ "date": "YYYY-MM-DD" }`  
- User must be **main_admin** or **admin** (otherwise you get 403).

Response example:

```json
{
  "success": true,
  "message": "Report for Wed, Jan 28, 2025 sent to kulalp447@gmail.com (3 employee(s) with no activity).",
  "count": 3,
  "recipient": "kulalp447@gmail.com"
}
```

---

## 5. Who is “inactive”

- **Active employees** only (`isActive` not false).
- **No activity for the date** = no attendance record for that day **with** a check-in time.
- So: anyone who did **not** check in that day is listed in the report.

---

## 6. Quick checklist

| Step | Action |
|------|--------|
| 1 | **On Render:** Set `RESEND_API_KEY` in Render env (get key at resend.com/api-keys). **Local:** Or set `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_SERVICE=gmail`. |
| 2 | Restart backend so cron is loaded. |
| 3 | Run `node scripts/test-employee-inactivity-report.js` (local) or call `POST /api/employees/inactivity-report/send` with JWT. |
| 4 | Check inbox (and spam) at kulalp447@gmail.com. |

**If you see "Connection timeout" or "ETIMEDOUT" when sending email:** Your host (e.g. Render) is blocking outbound SMTP. Switch to Resend: set `RESEND_API_KEY` in environment and redeploy; the app will use Resend over HTTPS instead of Gmail SMTP.

---

## 7. Changing the recipient or schedule

- **Recipient:** Edit `INACTIVITY_REPORT_EMAIL` in `utils/employeeInactivityReminderService.js` (e.g. change to another address).
- **Schedule:** Edit the cron expression in `utils/cronJobs.js` (e.g. `'0 19 * * *'` = 7 PM daily; change to another time if needed).
