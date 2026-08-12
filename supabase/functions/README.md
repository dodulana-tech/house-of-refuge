# Email notifications (Zoho Mail SMTP)

All outbound email from the platform goes through Zoho Mail SMTP. Nothing is
sent via Resend any more.

| Function | Trigger | Sends to |
|---|---|---|
| `send-notification` | Postgres `AFTER INSERT` trigger (pg_net) on the four public submission tables | Staff alert, plus applicant confirmation where enabled |
| `send-deposit-request` | Admin, from the Admission Detail screen | Applicant (BCC optional) |
| `get-deposit-application` | Public deposit page | n/a (no email) |

## What sends when

| Event | Table | Staff alert | Applicant confirmation |
|---|---|---|---|
| `application_submitted` | `applications` | yes | **yes** |
| `outpatient_booked` | `outpatient_bookings` | yes | **yes** |
| `financial_assistance_submitted` | `financial_assistance_applications` | yes | no (deliberate) |
| `donation_pledged` | `donations` | yes | no (deliberate) |

The two "no"s are policy, not missing work: both templates are written and one
flag turns each on, in `_shared/templates.ts`.

- **Financial assistance** is a need-based request. An automated email can land
  in a shared family inbox and disclose someone's circumstances. Admissions
  acknowledges these by phone.
- **Donations** rows start as an unverified `pledged` intent, so an automatic
  "thank you for your gift" would acknowledge money that has not arrived. Turn
  it on once pledges are reconciled against Paystack.

## One-time setup

### 1. Zoho app password

In Zoho Mail: **Settings → Security → App Passwords → Generate New Password**.
Use that value, not the account login password. If the mailbox has 2FA on (it
should), the account password will not authenticate over SMTP at all.

### 2. Function secrets

```bash
supabase secrets set \
  ZOHO_SMTP_USER=contact@houseofrefugeng.org \
  ZOHO_SMTP_PASSWORD='<app-password-from-step-1>' \
  NOTIFY_WEBHOOK_SECRET="$(openssl rand -hex 32)" \
  NOTIFY_STAFF_EMAILS='admissions@houseofrefugeng.org,contact@houseofrefugeng.org' \
  PUBLIC_APP_URL=https://www.houseofrefugeng.org
```

Optional: `ZOHO_SMTP_HOST` (default `smtp.zoho.com`, use `smtp.zoho.eu` /
`smtp.zoho.in` / `smtp.zoho.com.au` if the account is in that region),
`ZOHO_SMTP_PORT` (default `465`), `MAIL_FROM_NAME`, `MAIL_REPLY_TO`,
`DEPOSIT_BCC_EMAIL`, `DEPOSIT_CONTACT_EMAIL`.

`NOTIFY_STAFF_EMAILS` is the "everyone" list. Add or remove addresses here; no
redeploy needed, secrets are read per invocation.

### 3. Deploy

```bash
supabase functions deploy send-notification --no-verify-jwt
supabase functions deploy send-deposit-request
```

`send-notification` must be `--no-verify-jwt`: pg_net calls it from the database
with no user session. It is protected by the `x-notify-secret` header instead,
and rejects anything else with 401.

### 4. Run the migration, then wire it up

Run `supabase/migrations/20260808_email_notifications.sql`, then:

```sql
update private.notification_config set
  function_url   = 'https://<project-ref>.supabase.co/functions/v1/send-notification',
  webhook_secret = '<the same NOTIFY_WEBHOOK_SECRET value>',
  enabled        = true
where id = 1;
```

Until this runs, `enabled` is false and no mail is attempted. That is the
intended order: deploy first, switch on second.

## Design notes

**The webhook body carries only the row id, never the row.** Applications and
financial assistance rows hold clinical and financial detail, and pg_net
persists request bodies in its queue and response bodies in `net._http_response`
for hours. `send-notification` re-reads the row with the service role instead,
so that PII never leaves the database.

**A failed notification never blocks a submission.** The trigger swallows its
own errors and returns NULL, and pg_net dispatches asynchronously after commit.
A down mailbox cannot stop a family from applying.

**From is not caller-controlled.** Zoho rejects any sender that is not the
authenticated mailbox or one of its aliases, so `mailer.ts` always derives the
From address from `ZOHO_SMTP_USER`.

**A fresh SMTP connection per message.** Edge instances are short-lived and Zoho
drops idle sessions; a pooled client reliably fails on the second send. One
retry covers transient handshake failures and greylisting.

## Checking delivery

Every attempt, success or failure, is written to `notification_log`
(staff-readable):

```sql
select created_at, event, kind, recipients, status, error
from notification_log order by created_at desc limit 50;

-- failures only
select * from notification_log where status = 'failed' order by created_at desc;
```

If a row is missing entirely, the function was never reached. Check in order:
`private.notification_config.enabled`, then the pg_net response:

```sql
select id, status_code, content from net._http_response order by id desc limit 10;
```

`401` means `NOTIFY_WEBHOOK_SECRET` and `notification_config.webhook_secret`
have drifted apart.

## Known Zoho failure modes

| Symptom in `notification_log.error` | Cause |
|---|---|
| `535 Authentication Failed` | Using the account password instead of an app password, or wrong regional host |
| `553 Relaying disallowed` / sender rejected | From address is not the authenticated mailbox or a configured alias |
| `Sending limit exceeded` | Zoho daily send cap for the plan; free plans are low and count every recipient |
| Timeouts on port 465 | Try `ZOHO_SMTP_PORT=587` |
