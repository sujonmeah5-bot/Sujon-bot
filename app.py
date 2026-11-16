import os, json, hmac, hashlib, logging
from pathlib import Path
from datetime import datetime, timezone
import requests
from flask import Flask, request, jsonify, render_template, abort

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

DATA_FILE = Path(os.getenv("SUJON_BOT_DATA_FILE", "bot_data.json"))
VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "")
APP_SECRET = os.getenv("META_APP_SECRET", "")
ADMIN_KEY = os.getenv("SUJON_BOT_ADMIN_KEY", "")
API_VERSION = os.getenv("WHATSAPP_API_VERSION", "vXX.X")
PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN", "")

DEFAULTS = {
    "auto_reply_enabled": True,
    "welcome_enabled": True,
    "away_enabled": False,
    "auto_reply_text": "Assalamu Alaikum! ধন্যবাদ, আপনার মেসেজটি পেয়েছি। — SUJON BOT",
    "welcome_text": "Welcome! SUJON BOT-এ আপনাকে স্বাগতম ❤️",
    "away_text": "আমি এখন অফলাইনে আছি। পরে আপনার মেসেজের উত্তর দেব।",
    "last_sender": None,
    "logs": []
}

def load_data():
    if DATA_FILE.exists():
        try:
            saved = json.loads(DATA_FILE.read_text(encoding="utf-8"))
            return {**DEFAULTS, **saved}
        except Exception:
            app.logger.exception("Could not read bot data; using defaults")
    return DEFAULTS.copy()

def save_data(data):
    DATA_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

def admin_required():
    supplied = request.headers.get("X-Admin-Key", "")
    if not ADMIN_KEY or not hmac.compare_digest(supplied, ADMIN_KEY):
        abort(401)

def log_event(text):
    data = load_data()
    data["logs"].insert(0, {
        "time": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "event": text
    })
    data["logs"] = data["logs"][:50]
    save_data(data)

def send_text(to, body):
    if not all([ACCESS_TOKEN, PHONE_NUMBER_ID]) or "XX" in API_VERSION:
        app.logger.warning("WhatsApp API credentials/version are not configured")
        return False
    url = f"https://graph.facebook.com/{API_VERSION}/{PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to,
        "type": "text",
        "text": {"preview_url": False, "body": body}
    }
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=25)
        if not response.ok:
            app.logger.error("WhatsApp API error %s: %s", response.status_code, response.text)
            log_event(f"Send failed to {to}: HTTP {response.status_code}")
            return False
        log_event(f"Message sent to {to}")
        return True
    except requests.RequestException:
        app.logger.exception("WhatsApp request failed")
        return False

@app.get("/")
def home():
    return render_template("index.html")

@app.get("/api/config")
def get_config():
    admin_required()
    data = load_data()
    safe = {k: data[k] for k in [
        "auto_reply_enabled", "welcome_enabled", "away_enabled",
        "auto_reply_text", "welcome_text", "away_text", "logs"
    ]}
    return jsonify(safe)

@app.post("/api/config")
def update_config():
    admin_required()
    incoming = request.get_json(silent=True) or {}
    allowed = {
        "auto_reply_enabled", "welcome_enabled", "away_enabled",
        "auto_reply_text", "welcome_text", "away_text"
    }
    data = load_data()
    for key in allowed:
        if key in incoming:
            if key.endswith("_enabled"):
                data[key] = bool(incoming[key])
            else:
                value = str(incoming[key])[:1000]
                data[key] = value
    save_data(data)
    return jsonify({"ok": True})

@app.get("/webhook")
def verify_webhook():
    mode = request.args.get("hub.mode")
    token = request.args.get("hub.verify_token")
    challenge = request.args.get("hub.challenge")
    if mode == "subscribe" and VERIFY_TOKEN and hmac.compare_digest(token or "", VERIFY_TOKEN):
        return challenge or "", 200
    return "Webhook verification failed", 403

def valid_signature(raw_body):
    # Meta signs webhook payloads with your App Secret.
    if not APP_SECRET:
        return False
    signature = request.headers.get("X-Hub-Signature-256", "")
    expected = "sha256=" + hmac.new(
        APP_SECRET.encode("utf-8"), raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)

@app.post("/webhook")
def receive_webhook():
    raw = request.get_data()
    if not valid_signature(raw):
        return "Invalid webhook signature", 401

    payload = request.get_json(silent=True) or {}
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            contacts = value.get("contacts", [])
            for message in value.get("messages", []):
                sender = message.get("from")
                if not sender:
                    continue
                msg_type = message.get("type")
                body = ""
                if msg_type == "text":
                    body = message.get("text", {}).get("body", "").strip()
                if not body:
                    continue

                data = load_data()
                is_new_sender = data.get("last_sender") != sender
                data["last_sender"] = sender
                save_data(data)

                if data["away_enabled"]:
                    reply = data["away_text"]
                elif is_new_sender and data["welcome_enabled"]:
                    reply = data["welcome_text"]
                elif data["auto_reply_enabled"]:
                    reply = data["auto_reply_text"]
                else:
                    reply = ""

                log_event(f"Incoming text from {sender}")
                if reply:
                    send_text(sender, reply)

    # Status updates and other webhook events are acknowledged.
    return jsonify({"status": "received"}), 200

@app.get("/health")
def health():
    return jsonify({"ok": True, "app": "SUJON BOT"})

if __name__ == "__main__":
    # Local development only. Use a production WSGI server for deployment.
    app.run(host="127.0.0.1", port=int(os.getenv("PORT", "5000")), debug=False)
