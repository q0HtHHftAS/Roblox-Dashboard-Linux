module.exports = {
  apps: [
    {
      name: "steal-dash",
      script: "./node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: __dirname,
      exec_mode: "fork",
      instances: 1,
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
