/**
 * PM2 process manager config for the backend API.
 *
 * Usage (from repo root on VPS):
 *   cd /var/www/Tailor-Management-system
 *   npm --prefix backend install
 *   pm2 start deploy/ecosystem.config.cjs
 *   pm2 save
 *   pm2 startup
 */
module.exports = {
  apps: [
    {
      name: "tailor-api",
      cwd: "./backend",
      script: "src/index.js",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 8000,
      },
    },
  ],
};
