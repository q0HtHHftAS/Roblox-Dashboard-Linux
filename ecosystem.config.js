const path = require("path");

module.exports = {
  apps: [
    {
      name: "steal-dash",
      script: "./node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: path.join(__dirname, "StealDashbord"),
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
    {
      name: "roblox-bot",
      script: "dist/index.js",
      cwd: path.join(__dirname, "robloxupdatetracker"),
      autorestart: true,
      max_restarts: 1000,
      min_uptime: 5000,
      restart_delay: 10000,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
