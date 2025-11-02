import { execSync } from "child_process";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.test" });

// Set test environment
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key";

// Ensure test database exists
// Note: In CI/CD, ensure test database is created separately
if (!process.env.CI) {
  console.log("Test environment initialized");
}
