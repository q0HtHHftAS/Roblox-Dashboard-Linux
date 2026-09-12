// หน้า fail หลัง Discord authorize — มินิมอลแบบต้นแบบ: ดำล้วน ไม่มีโลโก้/การ์ด/ปุ่ม
// หัวอังกฤษ + คำอธิบายไทย เปลี่ยนตาม reason (?reason=...) ที่ signIn gate ส่งมา
const SUBTITLES: Record<string, string> = {
  "not-member":
    "บัญชีนี้ยังไม่ได้เข้ากลุ่ม Discord ที่กำหนด เข้ากลุ่มก่อนแล้วลองใหม่อีกครั้ง",
  "missing-role":
    "บัญชียังไม่ผ่านการยืนยันตัวตนในกลุ่ม ทำ /verify ในกลุ่มก่อนแล้วลองใหม่",
  "missing-id": "อ่าน Discord ID ไม่ได้ ลอง login ใหม่อีกครั้ง",
  "blocked": "บัญชีนี้ถูกระงับการใช้งาน ติดต่อแอดมิน",
  "registration-closed": "ตอนนี้ปิดรับสมาชิกใหม่ชั่วคราว กลับมาลองใหม่ภายหลัง",
  "not-configured": "เซิร์ฟเวอร์ตั้งค่าไม่ครบ แจ้งแอดมินให้ตรวจสอบ",
  "network-error": "ติดต่อ Discord ไม่ได้ชั่วคราว รอสักครู่แล้วลองใหม่",
  "check-failed": "ตรวจสอบสิทธิ์ไม่สำเร็จ ลอง login ใหม่อีกครั้ง",
};

const FALLBACK = "บัญชีนี้ไม่ได้รับอนุญาตให้ใช้งาน dashboard นี้";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reason?: string }>;
}) {
  const { reason } = await searchParams;
  const subtitle = (reason && SUBTITLES[reason]) || FALLBACK;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0b0d10] px-4 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-[#ef4444]">
        <i className="fa-solid fa-xmark text-2xl text-black"></i>
      </div>
      <h1 className="mt-6 text-[32px] font-bold leading-tight tracking-tight text-white">
        Authorization
        <br />
        failed
      </h1>
      <p className="mt-3 max-w-xs text-sm text-zinc-400" style={{ fontFamily: "var(--font-kanit)", fontWeight: 400 }}>
        {subtitle}
      </p>
    </div>
  );
}
