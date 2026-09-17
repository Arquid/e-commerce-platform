const REQUIRED_ENV_VARS = [
  "MONGO_URI",
  "JWT_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "CLIENT_URL",
] as const;

// Fails fast with a clear message at startup instead of letting the server
// boot "successfully" and only surface confusing errors (e.g. a 500 on the
// first login) once a request actually needs the missing value.
export function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Missing required environment variable(s): ${missing.join(", ")}`);
    process.exit(1);
  }
}
