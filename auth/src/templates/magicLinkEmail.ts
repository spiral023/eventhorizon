import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..", "..");
const templatePath = path.join(rootDir, "backend", "app", "templates", "emails", "base.html");

const fallbackTemplate = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>{% block title %}EventHorizon{% endblock %}</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f4f4;margin:0;padding:0;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="padding:24px 24px 16px;border-bottom:2px solid #3b82f6;text-align:center;font-weight:700;color:#3b82f6;">EventHorizon</div>
    <div style="padding:24px;">{% block content %}{% endblock %}</div>
    <div style="padding:16px 24px 24px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-align:center;">
      <p style="margin:4px 0;">© 2025 EventHorizon | <a href="{{ frontend_url }}" style="color:#6b7280;">Zur App</a></p>
      <p style="margin:4px 0;">Du erhältst diese E-Mail, weil du dich bei EventHorizon anmelden möchtest.</p>
    </div>
  </div>
</body>
</html>
`;

let baseTemplate = fallbackTemplate;
try {
  if (fs.existsSync(templatePath)) {
    baseTemplate = fs.readFileSync(templatePath, "utf-8");
  }
} catch (error) {
  console.warn("[auth] Email base template not found, using fallback.");
}

export function renderMagicLinkEmail({
  magicLinkUrl,
  frontendUrl = "https://event-horizon.sp23.online",
}: {
  magicLinkUrl: string;
  frontendUrl?: string;
}) {
  const content = `
    <h2 style="margin: 0 0 12px; font-size: 20px;">Anmeldung mit Magic Link</h2>
    <p style="margin: 0 0 12px;">Hallo,</p>
    <p style="margin: 0 0 16px;">Klicke auf den untenstehenden Button, um dich sofort anzumelden. Du benötigst kein Passwort.</p>
    <p style="margin: 0 0 16px;">
      <a href="${magicLinkUrl}" style="display:inline-block;padding:12px 18px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
        Jetzt anmelden
      </a>
    </p>
    <p style="margin: 0 0 8px; color: #475569;">Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:</p>
    <p style="margin: 0; font-size: 13px; color: #0f172a; word-break: break-all;">${magicLinkUrl}</p>
    <p style="margin: 16px 0 0; color: #6b7280; font-size: 14px;">Dieser Link ist 5 Minuten lang gültig.</p>
  `;

  const html = baseTemplate
    .replace("{% block title %}EventHorizon{% endblock %}", "EventHorizon – Magic Link Anmeldung")
    .replace("{% block content %}{% endblock %}", content)
    .replace("{{ frontend_url }}", frontendUrl);

  const subject = "Dein Magic Link zur Anmeldung";
  const text = [
    "Anmeldung mit Magic Link",
    "Hallo,",
    "Verwende diesen Link, um dich anzumelden:",
    `Link: ${magicLinkUrl}`,
    "Dieser Link ist 5 Minuten lang gültig.",
  ].join("\n\n");

  return {
    subject,
    text,
    html,
  };
}
