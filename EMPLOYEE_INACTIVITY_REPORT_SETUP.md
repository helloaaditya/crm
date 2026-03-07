# Employee Inactivity Report – Setup & Test

This feature sends a daily email to **kulalp447@gmail.com** listing employees who had **no check-in (no activity)** in the CRM for that day.

---

## 1. Environment (email)

In your backend `.env`:

```env
# Required for sending the report email
EMAIL_USER=your-sender@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_SERVICE=gmail
# Optional
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

As an **admin** user (main_admin or admin role):

```bash
# Report for today
curl -X POST http://localhost:5000/api/employees/inactivity-report/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Report for a specific date
curl -X POST http://localhost:5000/api/employees/inactivity-report/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"date":"2025-01-27"}'
```

Or from the frontend (e.g. Postman or your app), call:

- **POST** `/api/employees/inactivity-report/send`
- Headers: `Authorization: Bearer <admin JWT>`
- Body (optional): `{ "date": "YYYY-MM-DD" }`

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
| 1 | Set `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_SERVICE=gmail` in `.env`. |
| 2 | Restart backend so cron is loaded. |
| 3 | Run `node scripts/test-employee-inactivity-report.js` and check kulalp447@gmail.com. |
| 4 | (Optional) Call `POST /api/employees/inactivity-report/send` as admin to test from API. |

---

## 7. Changing the recipient or schedule

- **Recipient:** Edit `INACTIVITY_REPORT_EMAIL` in `utils/employeeInactivityReminderService.js` (e.g. change to another address).
- **Schedule:** Edit the cron expression in `utils/cronJobs.js` (e.g. `'0 19 * * *'` = 7 PM daily; change to another time if needed).
