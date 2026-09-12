import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/shared/lib/prisma";
import { generateApiKey, hashApiKey } from "@/shared/lib/apikey";
import { checkGuildMembership, isHardGateFailure } from "@/shared/lib/guildGate";
import { isRegistrationEnabled } from "@/shared/lib/siteSettings";
import type { JWT } from "next-auth/jwt";

declare module "next-auth/jwt" {
  interface JWT {
    discordId?: string;
    /** เวลา (ms) ที่ตรวจสมาชิก guild ผ่านครั้งล่าสุด — ใช้ revalidate เป็นระยะ */
    guildOkAt?: number;
  }
}

// ---- env fail-fast: พังตั้งแต่ boot ดีกว่าพังตอน user กำลัง login ----
const DISCORD_CLIENT_ID = (process.env.DISCORD_CLIENT_ID ?? "").trim();
const DISCORD_CLIENT_SECRET = (process.env.DISCORD_CLIENT_SECRET ?? "").trim();
if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
  throw new Error("[auth] Missing DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET in env");
}
const isProd = process.env.NODE_ENV === "production";
if (isProd && !process.env.AUTH_URL) {
  throw new Error("[auth] AUTH_URL must be set in production (never rely on Host header)");
}

// ช่องทาง login กลับที่อนุญาต — กัน open-redirect ผ่าน ?callbackUrl=
// หมายเหตุ: signIn gate ส่งคนไม่ผ่านไป "/auth/error?reason=..." ผ่าน redirect callback ตัวนี้
// (Auth.js ส่ง string ที่ signIn คืนมาเข้า redirect เสมอ) — เลยต้องอนุญาต path นี้ด้วย ไม่งั้นโดนปัดกลับ "/"
const ALLOWED_PATHS = new Set(["/", "/stealanegg", "/animeexpeditions", "/animeorigin", "/auth/error"]);
function isAllowedNextPath(url: string): boolean {
  const pathname = url.split("?", 1)[0];
  if (ALLOWED_PATHS.has(pathname)) return true;
  // share link สาธารณะแบบ read-only: /share/<token>
  if (pathname.startsWith("/share/")) return true;
  return false;
}

// Discord snowflake / avatar hash — validate ก่อนประกอบ URL (กัน profile แปลกๆ)
const SNOWFLAKE_RE = /^\d{17,20}$/;
const AVATAR_RE = /^[A-Za-z0-9_]+$/;

// Default avatar ตามระบบใหม่ของ Discord (discriminator = "0"):
// index = (userId >> 22) % 6 — ใช้ตอน user ไม่มีรูป custom (ไม่งั้นจะได้ URL .../null.png ที่โหลดไม่ขึ้น)
function defaultAvatarUrl(userId: string): string {
  try {
    if (!SNOWFLAKE_RE.test(userId)) throw new Error("bad id");
    const idx = Number((BigInt(userId) >> BigInt(22)) % BigInt(6));
    return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
  } catch {
    return "https://cdn.discordapp.com/embed/avatars/0.png";
  }
}

function discordAvatarUrl(userId: string, avatar: string | null | undefined, discriminator?: string | null): string {
  if (avatar && AVATAR_RE.test(avatar)) {
    const ext = avatar.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.${ext}?size=128`;
  }
  if (discriminator && discriminator !== "0") {
    const n = Number(discriminator);
    if (Number.isFinite(n)) return `https://cdn.discordapp.com/embed/avatars/${n % 5}.png`;
  }
  return defaultAvatarUrl(userId);
}

// Revalidate สมาชิก guild ทุก 60 นาที — โดนเตะออก guild แล้ว session จะหมดฤทธิ์เอง (fail-closed)
const GUILD_REVALIDATE_MS = 60 * 60 * 1000;
// Session สั้นลงเหลือ 7 วัน (default 30 วันนานเกินถ้า cookie หลุด)
const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // trustHost:true จำเป็น — Auth.js เวอร์ชันนี้ถ้าเป็น false จะโยน UntrustedHost ทุก request
  // (AUTH_URL ไม่ได้ช่วย): ปลอดภัยเพราะ app รับทราฟฟิกผ่าน Tailscale Funnel ตัวเดียวซึ่งเป็นคนตั้ง
  // Host header เอง — ห้ามเปิดพอร์ต 3000 ตรงสู่เน็ตที่ไม่ไว้ใจ (ตอนนี้ฟังแค่ localhost + tailnet)
  // AUTH_URL ที่ pin ไว้ยังใช้สร้าง redirect_uri ตอน OAuth จึงต้องตรงกับโดเมน funnel เสมอ
  trustHost: true,
  providers: [
    Discord({
      clientId: DISCORD_CLIENT_ID,
      clientSecret: DISCORD_CLIENT_SECRET,
    }),
  ],
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE, updateAge: 24 * 60 * 60 },
  jwt: { maxAge: SESSION_MAX_AGE },
  // cookies ใช้ default ของ Auth.js (httpOnly + SameSite=Lax + Secure เมื่อเป็น HTTPS) — อย่า override เอง
  pages: { error: "/auth/error" },
  callbacks: {
    // ประตูหลัก: ไม่ใช่สมาชิก guild (+ไม่อยู่ใน allowlist) = login ไม่ผ่านตั้งแต่ต้น
    async signIn({ profile, account }) {
      try {
        const discordId =
          (profile as any)?.id || (account as any)?.providerAccountId || "";
        if (!SNOWFLAKE_RE.test(String(discordId))) return "/auth/error?reason=missing-id";
        const didStr = String(discordId);
        const verdict = await checkGuildMembership(didStr);
        if (!verdict.ok) {
          console.warn(`[auth] signIn denied discord=${didStr} reason=${verdict.reason}`);
          return `/auth/error?reason=${verdict.reason}`;
        }
        // Admin block (User Management): โดนบล็อก = login ไม่ผ่าน (ยกเว้น admin กันล็อกตัวเอง)
        // หมายเหตุ: ไม่ import จาก @/shared/lib/admin ตรง ๆ — ไฟล์นั้น import auth กลับ (circular)
        const adminIds = (process.env.ADMIN_DISCORD_IDS ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter((s) => SNOWFLAKE_RE.test(s));
        const isAdmin = adminIds.includes(didStr);
        try {
          const row = await prisma.user.findUnique({
            where: { discordId: didStr },
            select: { isBlocked: true },
          });
          if (row?.isBlocked && !isAdmin) {
            console.warn(`[auth] signIn denied discord=${didStr} reason=blocked`);
            return "/auth/error?reason=blocked";
          }
        } catch (e) {
          console.error("[auth] block check failed", e);
        }
        // ปิดรับสมาชิกใหม่ (Settings.registrationEnabled): คนเก่า + admin ผ่านได้เหมือนเดิม
        try {
          if (!(await isRegistrationEnabled())) {
            const existing = await prisma.user
              .findUnique({ where: { discordId: didStr }, select: { id: true } })
              .catch(() => null);
            const linked = existing
              ? existing
              : await prisma.account
                  .findUnique({
                    // legacy row ที่ยังไม่มี discordId แต่มี Account link = user เก่า
                    where: { provider_providerAccountId: { provider: "discord", providerAccountId: didStr } },
                    select: { userId: true },
                  })
                  .catch(() => null);
            if (!existing && !linked && !isAdmin) {
              console.warn(`[auth] signIn denied discord=${didStr} reason=registration-closed`);
              return "/auth/error?reason=registration-closed";
            }
          }
        } catch (e) {
          console.error("[auth] registration gate failed", e);
        }
        return true;
      } catch (e) {
        console.error("[auth] signIn gate failed", e);
        return "/auth/error?reason=check-failed";
      }
    },
    // ล็อกปลายทางหลัง login — นอก allowlist ปัดกลับหน้าแรกเสมอ
    async redirect({ url, baseUrl }) {
      try {
        if (url.startsWith("/")) return baseUrl + (isAllowedNextPath(url) ? url : "/");
        const u = new URL(url);
        if (u.origin === baseUrl && isAllowedNextPath(u.pathname)) return url;
      } catch {}
      return baseUrl;
    },
    // เปิดไว้ให้ proxy/middleware เรียกตรวจ session ฝั่ง server
    async authorized({ auth: session }) {
      return !!session?.user;
    },
    async jwt({ token, user, account, profile }) {
      // On sign in, persist user id and discordId
      if (user) {
        token.id = user.id;
        // For credentials provider, use custom discordId field; for OAuth, use profile/account
        // @ts-ignore custom field from credentials authorize
        const discordId = (user as any)?.discordId || (profile as any)?.id || (account as any)?.providerAccountId;
        token.discordId = discordId || user.id;
        token.guildOkAt = Date.now();
        // Ensure apiKey exists for this user — เก็บแบบ hash เท่านั้น (คีย์จริงโชว์ผ่าน
        // /api/user/api-key ตอน provision/rotate ครั้งเดียว ไม่ใส่ลง JWT/session)
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        if (dbUser && !dbUser.apiKey) {
          const newKey = generateApiKey();
          try {
            await prisma.user.update({ where: { id: user.id }, data: { apiKey: hashApiKey(newKey), discordId: String(token.discordId) } });
          } catch {
            // If discordId already exists (race), just set apiKey
            await prisma.user.update({ where: { id: user.id }, data: { apiKey: hashApiKey(newKey) } });
          }
        } else if (dbUser?.apiKey) {
          if (!dbUser.discordId && token.discordId) {
            try {
              await prisma.user.update({ where: { id: user.id }, data: { discordId: String(token.discordId) } });
            } catch {
              // Ignore unique constraint if discordId already taken
            }
          }
        }
      } else if (token?.id) {
        // แถว user ใน DB หาย (โดนลบ/ล้าง) = session กำพร้า — ตัดทิ้งทันที (บังคับ logout)
        // (DB ล่มชั่วคราวจะ throw ไม่ใช่ null — กรณีนั้นคง session ไว้แล้วลองใหม่รอบหน้า)
        try {
          const owner = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { id: true },
          });
          if (!owner) {
            console.warn("[auth] user row gone, dropping orphan session");
            return null as any;
          }
        } catch (e) {
          console.error("[auth] orphan-session check failed", e);
        }
        // On subsequent calls, ensure discordId is in token
        if (!token.discordId) {
          const dbUser = await prisma.user.findUnique({ where: { id: token.id as string } });
          if (dbUser) {
            if (!token.discordId && dbUser.discordId) token.discordId = dbUser.discordId;
          }
        }
        // Revalidate สมาชิก guild เป็นระยะ — โดนเตะ/หมด role แล้วคืน null = ตัด session ทันที
        // (network-error ไม่ตัด แค่ลองใหม่รอบหน้า)
        try {
          const last = typeof token.guildOkAt === "number" ? token.guildOkAt : 0;
          if (token.discordId && Date.now() - last > GUILD_REVALIDATE_MS) {
            const verdict = await checkGuildMembership(String(token.discordId));
            if (verdict.ok) {
              token.guildOkAt = Date.now();
            } else if (isHardGateFailure(verdict.reason)) {
              console.warn(`[auth] guild membership lost (${verdict.reason}), dropping session`);
              return null as any;
            }
          }
        } catch (e) {
          console.error("[auth] guild revalidate failed", e);
        }
        // token เก่าที่ไม่มีรูปเลย: ดึงจาก DB, ไม่มีอีกใช้ default avatar
        if (!(token as any).picture) {
          try {
            const dbU = await prisma.user.findUnique({ where: { id: token.id as string } });
            const did = (token.discordId as string) || dbU?.discordId || undefined;
            if (dbU?.image) {
              (token as any).picture = dbU.image;
            } else if (did) {
              (token as any).picture = defaultAvatarUrl(did);
            }
          } catch {}
        }
      }
      // ตอน login ใหม่: สร้างรูป Discord ที่ถูกต้องจาก profile (กัน .../null.png + รองรับ avatar แบบ gif)
      if (account && profile) {
        const p = profile as any;
        if (p?.id && SNOWFLAKE_RE.test(String(p.id))) {
          const pic = discordAvatarUrl(String(p.id), (p.avatar as string | null) ?? null, p.discriminator);
          (token as any).picture = pic;
          try {
            if (token?.id) {
              await prisma.user.update({ where: { id: token.id as string }, data: { image: pic } });
            }
          } catch {}
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        // @ts-ignore
        session.user.id = token.id as string;
        // @ts-ignore
        session.user.discordId = token.discordId as string;
        if ((token as any).picture) session.user.image = (token as any).picture as string;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Generate apiKey and discordId for new user if missing (เก็บแบบ hash — โชว์ครั้งเดียวตอน provision)
      const apiKey = hashApiKey(generateApiKey());
      // user.id is cuid, but we need discordId from account - will be set in jwt
      // Ensure apiKey is set
      await prisma.user.update({
        where: { id: user.id },
        data: { apiKey },
      });
    },
  },
});
