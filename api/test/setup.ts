// Load TEST_DATABASE_URL from .env. On a machine without .env, the variables must already be set.
try {
  process.loadEnvFile('.env');
} catch {
  // No .env file.
}
