import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Resolve base template relative to monorepo root if vorhanden; fallback auf eingebettetes Template.
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
      <p style="margin:4px 0;">© 2026 EventHorizon | <a href="{{ frontend_url }}" style="color:#6b7280;">Zur App</a></p>
      <p style="margin:4px 0;">Du erhältst diese E-Mail, weil du bei EventHorizon registriert bist.</p>
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
  // Fallback remains; avoid crashing on missing template in dev container.
  console.warn("[auth] Email base template not found, using fallback.");
}

export function renderOtpEmail({
  otp,
  type,
  frontendUrl = "https://event-horizon.sp23.online",
}: {
  otp: string;
  type: "sign-in" | "email-verification" | "forget-password";
  frontendUrl?: string;
}) {
  const title =
    type === "sign-in"
      ? "Anmeldung bestätigen"
      : type === "email-verification"
      ? "E-Mail verifizieren"
      : "Passwort zurücksetzen";

  const intro =
    type === "sign-in"
      ? "Gib diesen Code ein, um dich anzumelden."
      : type === "email-verification"
      ? "Gib diesen Code ein, um deine E-Mail-Adresse zu bestätigen."
      : "Gib diesen Code ein, um dein Passwort zurückzusetzen.";

  const content = `
    <h2 style="margin: 0 0 12px; font-size: 20px;">${title}</h2>
    <p style="margin: 0 0 12px;">${intro}</p>
    <p style="margin: 16px 0; font-size: 24px; letter-spacing: 4px; font-weight: 700; color: #0f172a;">
      ${otp}
    </p>
    <p style="margin: 0 0 8px; color: #475569;">Der Code ist wenige Minuten gültig.</p>
    <p style="margin: 0; color: #64748b; font-size: 13px;">
      Falls du diese Anfrage nicht gestellt hast, ignoriere diese E-Mail.
    </p>
  `;

  const html = baseTemplate
    .replace("{% block title %}EventHorizon{% endblock %}", `EventHorizon – ${title}`)
    .replace("{% block content %}{% endblock %}", content)
    .replace("{{ frontend_url }}", frontendUrl);

  return {
    subject: `Dein EventHorizon Code: ${otp}`,
    text: `${title}\n\n${intro}\n\nCode: ${otp}\n\nDer Code ist für wenige Minuten gültig. Falls du diese Anfrage nicht gestellt hast, ignoriere diese E-Mail.`,
    html,
  };
}
