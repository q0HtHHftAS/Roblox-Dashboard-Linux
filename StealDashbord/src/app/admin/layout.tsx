import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getAdminGate } from "@/shared/lib/admin";
import { AdminNav } from "@/shared/admin/AdminNav";

// ประตูชั้น server: ไม่ใช่ admin = 404 เหมือนไม่มีหน้านี้ (Q13)
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const gate = await getAdminGate(jar.get("sd_admin2fa")?.value ?? null);
  if (gate.status === "denied") notFound();
  return (
    <div className="min-h-screen bg-[#0b0d10] text-[#e3e6ea]">
      <AdminNav />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
