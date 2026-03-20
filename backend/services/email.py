import os
import resend

resend.api_key = os.environ.get("RESEND_API_KEY", "")

FROM = "StockMind <noreply@stockmind.it.com>"


def send_password_reset(to: str, reset_link: str) -> None:
    resend.Emails.send({
        "from": FROM,
        "to": [to],
        "subject": "Reset your StockMind password",
        "html": f"""
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#080C14;color:#fff;border-radius:12px;">
          <h2 style="margin:0 0 8px;font-size:20px;">Reset your password</h2>
          <p style="color:#9ca3af;margin:0 0 24px;font-size:14px;">
            Click the button below to set a new password. This link expires in 1 hour.
          </p>
          <a href="{reset_link}"
             style="display:inline-block;padding:12px 24px;background:#00E676;color:#080C14;
                    font-weight:600;font-size:14px;border-radius:8px;text-decoration:none;">
            Reset Password
          </a>
          <p style="color:#6b7280;margin:24px 0 0;font-size:12px;">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
        """,
    })


def send_welcome(to: str, username: str) -> None:
    resend.Emails.send({
        "from": FROM,
        "to": [to],
        "subject": "Welcome to StockMind",
        "html": f"""
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#080C14;color:#fff;border-radius:12px;">
          <h2 style="margin:0 0 8px;font-size:20px;">Welcome, {username}</h2>
          <p style="color:#9ca3af;margin:0 0 24px;font-size:14px;">
            Your StockMind account is ready. Add an AI provider key in Settings to start using
            real-time analysis and ML predictions.
          </p>
          <a href="https://stockmind.it.com/dashboard"
             style="display:inline-block;padding:12px 24px;background:#00E676;color:#080C14;
                    font-weight:600;font-size:14px;border-radius:8px;text-decoration:none;">
            Go to Dashboard
          </a>
        </div>
        """,
    })


def send_password_changed(to: str) -> None:
    resend.Emails.send({
        "from": FROM,
        "to": [to],
        "subject": "Your StockMind password was changed",
        "html": """
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#080C14;color:#fff;border-radius:12px;">
          <div style="margin-bottom:24px;">
            <span style="font-family:monospace;font-size:13px;font-weight:600;letter-spacing:0.2em;color:#fff;">STOCKMIND</span>
          </div>
          <h2 style="margin:0 0 8px;font-size:20px;color:#fff;">Password changed</h2>
          <p style="color:#9ca3af;margin:0 0 16px;font-size:14px;line-height:1.6;">
            Your StockMind password was successfully updated. If you made this change, no action is needed.
          </p>
          <p style="color:#9ca3af;margin:0 0 24px;font-size:14px;line-height:1.6;">
            If you didn't do this, reset your password immediately.
          </p>
          <a href="https://stockmind.it.com/sign-in/forgot"
             style="display:inline-block;padding:12px 28px;background:#FF3D57;color:#fff;
                    font-weight:700;font-size:14px;border-radius:8px;text-decoration:none;">
            Reset Password Now
          </a>
          <div style="border-top:1px solid #1f2937;margin-top:28px;padding-top:16px;">
            <p style="color:#374151;margin:0;font-size:11px;">StockMind &mdash; stockmind.it.com</p>
          </div>
        </div>
        """,
    })


def send_alert_triggered(to: str, symbol: str, direction: str, target: float, current: float) -> None:
    color = "#00E676" if direction == "above" else "#FF3D57"
    label = "risen above" if direction == "above" else "fallen below"
    resend.Emails.send({
        "from": FROM,
        "to": [to],
        "subject": f"Price alert triggered: {symbol}",
        "html": f"""
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#080C14;color:#fff;border-radius:12px;">
          <h2 style="margin:0 0 8px;font-size:20px;color:{color};">Alert: {symbol}</h2>
          <p style="color:#9ca3af;margin:0 0 24px;font-size:14px;">
            <strong style="color:#fff;">{symbol}</strong> has {label} your target of
            <strong style="color:{color};">${target:,.2f}</strong>.
            Current price: <strong style="color:#fff;">${current:,.2f}</strong>.
          </p>
          <a href="https://stockmind.it.com/dashboard"
             style="display:inline-block;padding:12px 24px;background:{color};color:#080C14;
                    font-weight:600;font-size:14px;border-radius:8px;text-decoration:none;">
            View on StockMind
          </a>
        </div>
        """,
    })
