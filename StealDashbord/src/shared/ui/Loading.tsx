interface LoadingProps {
  /** ข้อความใต้ spinner (default: "Loading…") */
  text?: string;
  /** fullscreen = กลางจอเต็มหน้า (ตอนเช็ค session), inline = กลางคอนเทนต์ (ตอนโหลดข้อมูล) */
  variant?: "fullscreen" | "inline";
}

export function Loading({ text = "Loading…", variant = "inline" }: LoadingProps) {
  if (variant === "fullscreen") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0b0d10] px-4 text-center">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
          <p className="text-xs font-semibold text-zinc-500">{text}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
      <p className="text-xs font-semibold text-zinc-500">{text}</p>
    </div>
  );
}
