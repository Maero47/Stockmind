import os
import resend

resend.api_key = os.environ.get("RESEND_API_KEY", "")

FROM = "StockMind <team@stockmind.it.com>"
SITE = "https://stockmind.it.com"


def _wrap(body_html: str) -> str:
    return f"""\
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;border:1px solid #e4e4e7;">
        <tr><td style="padding:32px 28px;">
          <p style="margin:0 0 24px;font-size:13px;font-weight:700;letter-spacing:0.08em;color:#18181b;">STOCKMIND</p>
          {body_html}
          <p style="margin:32px 0 0;padding-top:20px;border-top:1px solid #e4e4e7;font-size:11px;color:#a1a1aa;line-height:1.5;">
            You received this because you have a StockMind account.<br>
            <a href="{SITE}/settings" style="color:#a1a1aa;">Manage notification preferences</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def send_password_reset(to: str, reset_link: str) -> None:
    resend.Emails.send({
        "from": FROM,
        "to": [to],
        "subject": "Reset your StockMind password",
        "text": f"Reset your StockMind password by visiting: {reset_link}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.",
        "html": _wrap(f"""\
          <h2 style="margin:0 0 8px;font-size:20px;color:#18181b;">Reset your password</h2>
          <p style="color:#52525b;margin:0 0 24px;font-size:14px;line-height:1.6;">
            Click the button below to set a new password. This link expires in 1 hour.
          </p>
          <a href="{reset_link}"
             style="display:inline-block;padding:12px 24px;background-color:#18181b;color:#ffffff;
                    font-weight:600;font-size:14px;border-radius:6px;text-decoration:none;">
            Reset Password
          </a>
          <p style="color:#a1a1aa;margin:20px 0 0;font-size:12px;">
            If you didn't request this, you can safely ignore this email.
          </p>"""),
    })


def send_welcome(to: str, username: str) -> None:
    resend.Emails.send({
        "from": FROM,
        "to": [to],
        "subject": f"Welcome to StockMind, {username}",
        "text": f"Welcome to StockMind, {username}! Your account is ready. Visit {SITE}/dashboard to get started.",
        "html": _wrap(f"""\
          <h2 style="margin:0 0 8px;font-size:20px;color:#18181b;">Welcome, {username}</h2>
          <p style="color:#52525b;margin:0 0 24px;font-size:14px;line-height:1.6;">
            Your StockMind account is ready. Add a provider key in Settings to start using
            real-time analysis and predictions.
          </p>
          <a href="{SITE}/dashboard"
             style="display:inline-block;padding:12px 24px;background-color:#18181b;color:#ffffff;
                    font-weight:600;font-size:14px;border-radius:6px;text-decoration:none;">
            Go to Dashboard
          </a>"""),
    })


def send_password_changed(to: str) -> None:
    resend.Emails.send({
        "from": FROM,
        "to": [to],
        "subject": "Your StockMind password was changed",
        "text": f"Your StockMind password was changed. If this wasn't you, reset it immediately at {SITE}/sign-in/forgot",
        "html": _wrap(f"""\
          <h2 style="margin:0 0 8px;font-size:20px;color:#18181b;">Password changed</h2>
          <p style="color:#52525b;margin:0 0 16px;font-size:14px;line-height:1.6;">
            Your StockMind password was successfully updated. If you made this change, no action is needed.
          </p>
          <p style="color:#52525b;margin:0 0 24px;font-size:14px;line-height:1.6;">
            If you didn't do this, reset your password immediately.
          </p>
          <a href="{SITE}/sign-in/forgot"
             style="display:inline-block;padding:12px 24px;background-color:#dc2626;color:#ffffff;
                    font-weight:600;font-size:14px;border-radius:6px;text-decoration:none;">
            Reset Password Now
          </a>"""),
    })


def send_alert_triggered(to: str, symbol: str, direction: str, target: float, current: float) -> None:
    label = "risen above" if direction == "above" else "fallen below"
    resend.Emails.send({
        "from": FROM,
        "to": [to],
        "subject": f"{symbol} price alert triggered",
        "text": f"{symbol} has {label} your target of ${target:,.2f}. Current price: ${current:,.2f}. View at {SITE}/stock/{symbol}",
        "html": _wrap(f"""\
          <h2 style="margin:0 0 8px;font-size:20px;color:#18181b;">Price Alert: {symbol}</h2>
          <p style="color:#52525b;margin:0 0 8px;font-size:14px;line-height:1.6;">
            <strong>{symbol}</strong> has {label} your target of <strong>${target:,.2f}</strong>.
          </p>
          <p style="color:#52525b;margin:0 0 24px;font-size:14px;line-height:1.6;">
            Price at trigger: <strong>${current:,.2f}</strong>
          </p>
          <a href="{SITE}/stock/{symbol}"
             style="display:inline-block;padding:12px 24px;background-color:#18181b;color:#ffffff;
                    font-weight:600;font-size:14px;border-radius:6px;text-decoration:none;">
            View {symbol}
          </a>"""),
    })
