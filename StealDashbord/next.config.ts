import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// CSP แบบไม่ใช้ nonce (ตาม Next docs "Without Nonces"): Next/Tailwind ต้องใช้ inline script+style,
// เลยอนุญาต 'unsafe-inline' แต่ล็อก origin อื่นทั้งหมด — style/font จาก cdnjs เท่านั้น,
// รูปจาก self/data/blob + rbxcdn (ปลายทาง redirect ของ /api/thumb) + รูปโปรไฟล์ Discord, ห้าม object/iframe ฝังเว็บ
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
  "font-src 'self' https://cdnjs.cloudflare.com data:",
  "img-src 'self' data: blob: https://*.rbxcdn.com https://cdn.discordapp.com",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "127.0.0.1",
    "192.168.1.100",
    "localhost",
    // Tunnels: Tailscale Funnel + Cloudflare Quick Tunnel (dev-only; removes in prod)
    "kernelos-pc.tailba1ab3.ts.net",
    "niko6000.tail14957c.ts.net",
    "pink-freeze-thomas-straight.trycloudflare.com",
  ],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          // HSTS เฉพาะ production (dev รันบน http ใส่ไปไม่มีผลแถมเสี่ยงค้าง cache)
          ...(!isDev
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
