import { betterAuth } from "better-auth";
import { jwt, emailOTP, magicLink, haveIBeenPwned } from "better-auth/plugins";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { Pool } from "pg";
import { Resend } from "resend";
import { renderOtpEmail } from "./templates/otpEmail";
import { renderVerificationEmail } from "./templates/verificationEmail";
import { renderResetPasswordEmail } from "./templates/resetPasswordEmail";
import { renderMagicLinkEmail } from "./templates/magicLinkEmail";

const {
  BETTER_AUTH_SECRET,
  BETTER_AUTH_BASE_URL = "http://localhost:5173",
  BETTER_AUTH_BASE_PATH = "/api/auth",
  DATABASE_URL = "postgres://user:password@db:5432/eventhorizon",
  TRUSTED_ORIGINS = "http://localhost:5173",
  BETTER_AUTH_JWT_ISSUER = "eventhorizon-auth",
  BETTER_AUTH_JWT_AUDIENCE = "eventhorizon-api",
  BETTER_AUTH_JWT_EXP = "15m",
  PORT = "3000",
  BETTER_AUTH_DB_SCHEMA = "auth",
  RESEND_API_KEY,
  MAIL_FROM_EMAIL = "noreply@eventhorizon.app",
} = process.env;

if (!BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET is required");
}

const trustedOrigins = TRUSTED_ORIGINS.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const pool = new Pool({
  connectionString: DATABASE_URL.includes("search_path=")
    ? DATABASE_URL
    : `${DATABASE_URL}${DATABASE_URL.includes("?") ? "&" : "?"}options=-c search_path=${BETTER_AUTH_DB_SCHEMA},public`,
});

// Ensure schema exists for Better Auth tables to avoid clashing with app tables.
pool.query(`CREATE SCHEMA IF NOT EXISTS "${BETTER_AUTH_DB_SCHEMA}"`).catch((err) => {
  console.error("Failed to ensure auth schema", err);
  process.exit(1);
});

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

const auth = betterAuth({
  appName: "EventHorizon Auth",
  baseURL: BETTER_AUTH_BASE_URL,
  basePath: BETTER_AUTH_BASE_PATH,
  secret: BETTER_AUTH_SECRET,
  database: pool,
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      const { subject, text, html } = renderResetPasswordEmail({
        resetUrl: url,
        userName: user.name,
        frontendUrl: BETTER_AUTH_BASE_URL,
      });

      if (!resend) {
        console.warn("[auth] RESEND_API_KEY not set; reset URL:", url);
        return;
      }

      void resend.emails
        .send({
          from: MAIL_FROM_EMAIL,
          to: user.email,
          subject,
          text,
          html,
        })
        .catch((error) => {
          console.error("[auth] Failed to send reset password email", error);
        });
    },
    onPasswordReset: async ({ user }) => {
      console.log(`[auth] Password reset successfully for user: ${user.email}`);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const { subject, text, html } = renderVerificationEmail({
        verificationUrl: url,
        userName: user.name,
        frontendUrl: BETTER_AUTH_BASE_URL,
      });

      if (!resend) {
        console.warn("[auth] RESEND_API_KEY not set; verification URL:", url);
        return;
      }

      // Do not block the request on mail delivery; log on failure.
      void resend.emails
        .send({
          from: MAIL_FROM_EMAIL,
          to: user.email,
          subject,
          text,
          html,
        })
        .catch((error) => {
          console.error("[auth] Failed to send verification email", error);
        });
    },
  },
  plugins: [
    haveIBeenPwned({
      paths: ["/sign-up/email"],
      customPasswordCompromisedMessage:
        "Dieses Passwort wurde in einem Datenleck gefunden. Bitte wähle ein anderes Passwort.",
    }),
    magicLink({
      sendMagicLink: async ({ email, token, url }, ctx) => {
        const { subject, text, html } = renderMagicLinkEmail({
          magicLinkUrl: url,
          frontendUrl: BETTER_AUTH_BASE_URL,
        });

        if (!resend) {
          console.warn("[auth] RESEND_API_KEY not set; Magic Link URL:", url);
          return;
        }

        try {
          await resend.emails.send({
            from: MAIL_FROM_EMAIL,
            to: email,
            subject,
            text,
            html,
          });
        } catch (error) {
          console.error("[auth] Failed to send magic link email", error);
        }
      },
    }),
    emailOTP({
      overrideDefaultEmailVerification: false,
      otpLength: 6,
      expiresIn: 300,
      allowedAttempts: 3,
      async sendVerificationOTP({ email, otp, type }) {
        const { subject, text, html } = renderOtpEmail({
          otp: String(otp),
          type,
          frontendUrl: BETTER_AUTH_BASE_URL,
        });
        if (!resend) {
          console.warn("[auth] RESEND_API_KEY not set; OTP:", { email, otp, type });
          return;
        }
        try {
          await resend.emails.send({
            from: MAIL_FROM_EMAIL,
            to: email,
            subject,
            text,
            html,
          });
        } catch (error) {
          console.error("[auth] Failed to send OTP email", error);
          // Do not leak timing; continue without throwing
        }
      },
    }),
    jwt({
      jwt: {
        issuer: BETTER_AUTH_JWT_ISSUER,
        audience: BETTER_AUTH_JWT_AUDIENCE,
        expirationTime: BETTER_AUTH_JWT_EXP,
        definePayload: ({ user }) => ({
          email: user.email,
          name: user.name,
        }),
        getSubject: ({ user }) => user.id,
      },
      jwks: {
        jwksPath: "/jwks",
        rotationInterval: 60 * 60 * 24 * 30,
        keyPairConfig: {
          alg: "RS256",
          modulusLength: 2048,
        },
      },
    }),
  ],
  user: {
    modelName: `${BETTER_AUTH_DB_SCHEMA}.user`,
  },
  session: {
    modelName: `${BETTER_AUTH_DB_SCHEMA}.session`,
  },
  verification: {
    modelName: `${BETTER_AUTH_DB_SCHEMA}.verification`,
  },
  account: {
    modelName: `${BETTER_AUTH_DB_SCHEMA}.account`,
  },
});

// Run Better Auth migrations at startup to ensure tables exist in the auth schema.
auth.$context
  .then(async (ctx) => {
    if (typeof ctx.runMigrations === "function") {
      try {
        await ctx.runMigrations();
        console.log("[auth] migrations applied");
      } catch (err: any) {
        const msg = typeof err?.message === "string" ? err.message.toLowerCase() : "";
        if (err?.code === "42P07" || msg.includes("already exists")) {
          console.warn("[auth] migrations skipped: tables already exist");
        } else {
          console.error("[auth] failed to run migrations", err);
          process.exit(1);
        }
      }
    }
  })
  .catch((err) => {
    console.error("[auth] failed to run migrations", err);
    process.exit(1);
  });

const app = new Hono();

app.use(
  "/*",
  cors({
    origin: (origin) => {
      if (!origin) return BETTER_AUTH_BASE_URL;
      if (trustedOrigins.includes(origin)) return origin;
      return BETTER_AUTH_BASE_URL;
    },
    credentials: true,
  }),
);

app.get("/health", (c) => c.text("ok"));
app.all("*", async (c) => auth.handler(c.req.raw));

serve({
  fetch: app.fetch,
  port: Number(PORT),
});
