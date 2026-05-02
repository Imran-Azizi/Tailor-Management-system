import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { google } from "googleapis";

const DRIVE_SCOPE = ["https://www.googleapis.com/auth/drive"];

function resolvePathFromEnv(envName, fallback) {
  const value = process.env[envName] || fallback;
  return path.resolve(process.cwd(), value);
}

async function loadClientConfig(clientPath) {
  const raw = await fs.readFile(clientPath, "utf8");
  const json = JSON.parse(raw);
  const cfg = json.installed || json.web || json;

  const clientId = cfg.client_id;
  const clientSecret = cfg.client_secret;
  const redirectUri = Array.isArray(cfg.redirect_uris)
    ? cfg.redirect_uris[0]
    : cfg.redirect_uri;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "OAuth client file must include client_id, client_secret, and redirect_uris/redirect_uri.",
    );
  }

  return { clientId, clientSecret, redirectUri };
}

async function main() {
  const clientPath = resolvePathFromEnv(
    "GOOGLE_OAUTH_CLIENT_PATH",
    "src/config/tailor-oauth-settings.json",
  );
  const tokenPath = resolvePathFromEnv(
    "GOOGLE_OAUTH_TOKEN_PATH",
    "src/config/tailor-oauth-token.json",
  );

  const { clientId, clientSecret, redirectUri } =
    await loadClientConfig(clientPath);

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const authUrl = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: DRIVE_SCOPE,
  });

  console.log("Open this URL in your browser and approve access:\n");
  console.log(authUrl);
  console.log("\nPaste the authorization code here.");

  const rl = readline.createInterface({ input, output });
  const code = (await rl.question("Authorization code: ")).trim();
  rl.close();

  if (!code) {
    throw new Error("No authorization code provided.");
  }

  const { tokens } = await oauth2.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      "No refresh_token returned. Re-run and make sure prompt=consent is used with the same Google account.",
    );
  }

  await fs.mkdir(path.dirname(tokenPath), { recursive: true });
  await fs.writeFile(tokenPath, `${JSON.stringify(tokens, null, 2)}\n`, "utf8");

  console.log(`Saved token to: ${tokenPath}`);
}

main().catch((error) => {
  console.error("Failed to generate OAuth token:", error.message || error);
  process.exit(1);
});
