# SUJON BOT — WhatsApp Cloud API starter

A small Flask dashboard and webhook starter for the **official WhatsApp Business Platform Cloud API**.

## Included
- Responsive web dashboard
- Enable/disable text auto-reply, welcome, and away replies
- Webhook GET verification
- Webhook POST signature validation using your Meta App Secret
- Sends text replies through the Cloud API
- Basic recent activity log

## Important limitations
- This is a starter project, not a deployed/live bot.
- Welcome means the first inbound message from a sender since the app's stored `last_sender` value changes. It is **not** a WhatsApp group-join event.
- WhatsApp Cloud API does not provide normal WhatsApp personal-account features such as presence/online status or general group-admin automation.
- The API enforces the customer-service window and approved-template rules. For business-initiated messages outside the allowed window, use an approved template.
- `hello_world` is a template example; this starter's webhook replies are ordinary text replies to inbound messages.

## Setup
1. Install Python 3.10+.
2. Create a virtual environment and install dependencies:
   ```bash
   python -m venv .venv
   # Windows: .venv\Scripts\activate
   # macOS/Linux:
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
3. Copy `.env.example` to `.env` and fill in values from Meta for Developers. Do not share or commit secrets.
4. Export environment variables from `.env` using your preferred environment loader or hosting provider's secret settings. Flask does not load `.env` automatically.
5. Set `WHATSAPP_API_VERSION` to a currently supported Graph API version from Meta's documentation (replace `vXX.X`).
6. Run locally:
   ```bash
   python app.py
   ```
7. For webhook testing, expose the local server through a secure HTTPS tunnel. In your Meta app's WhatsApp webhook settings:
   - Callback URL: `https://YOUR_PUBLIC_HTTPS_HOST/webhook`
   - Verify token: same as `WHATSAPP_VERIFY_TOKEN`
   - Subscribe to the `messages` webhook field.
8. Configure the Meta App Secret, phone number ID, and access token in the hosting environment.

## Production checklist
- Deploy behind HTTPS using a production WSGI server, e.g. `gunicorn -w 2 app:app`.
- Keep access tokens, app secret, verify token, and admin key in hosting secrets; never put them in frontend JavaScript.
- Use a strong unique admin key and add proper user authentication, rate limiting, CSRF protection, and audit logging before exposing the dashboard publicly.
- Use a persistent database instead of the JSON file for multi-worker or production deployments.
- Add webhook retry/idempotency handling and message deduplication before production use.
- Review Meta's current WhatsApp Business Platform policies, pricing, templates, and API version requirements.

## Environment variables
See `.env.example`.
