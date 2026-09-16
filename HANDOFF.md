# Take the Mic landing page handoff

## Current status

- The production-facing page is complete and responsive.
- The application is a three-step flow with inline validation and device-local draft saving.
- Preview mode is intentionally enabled, so no applicant data leaves the browser before approval.
- The form payload and Resend email handler are ready for integration.

## Approval-to-launch checklist

1. Confirm the final application recipient.
2. Confirm the verified Resend sending domain and From address.
3. Add the three environment variables shown in `.env.example` to the production host.
4. Mount `server/application-worker.mjs` at `POST /api/apply`, or adapt its exported `handleApplicationRequest` function to the production framework.
5. In `dist/form-config.js`, change `preview` to `false`. Keep `endpoint` set to `/api/apply` unless the production route differs.
6. Run one internal application test and verify:
   - the email arrives at the approved recipient;
   - Reply goes to the applicant's email;
   - required fields and consent are present;
   - the success state appears only after Resend accepts the email.

## Form payload

The browser sends JSON with these fields:

- `first_name`
- `last_name`
- `email`
- `phone`
- `role`
- `company`
- `arena`
- `frustration`
- `why_now`
- `readiness`
- `consent`
- `website` — hidden honeypot; must remain empty for real applicants

## Security and launch notes

- Never put the Resend API key in browser code or commit it to the repository.
- The handler trims input, caps field lengths, escapes all applicant content in the email, validates required fields, and includes a honeypot.
- Add the production host's preferred rate limiting or Turnstile protection before broad paid traffic.
- Keep preview mode enabled until the recipient, sending domain, and privacy/SMS language are approved.
