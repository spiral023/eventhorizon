import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { Pool } from "pg";

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

const auth = betterAuth({
  appName: "EventHorizon Auth",
  baseURL: BETTER_AUTH_BASE_URL,
  basePath: BETTER_AUTH_BASE_PATH,
  secret: BETTER_AUTH_SECRET,
  database: pool,
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
      strategy: "compact",
    },
  },
  plugins: [
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
      await ctx.runMigrations();
      console.log("[auth] migrations applied");
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
