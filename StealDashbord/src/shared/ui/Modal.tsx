"use client";
import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { lockBodyScroll, unlockBodyScroll } from "@/shared/lib/bodyScrollLock";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ isOpen, onClose, title, children, maxWidth = "max-w-lg" }: ModalProps) {
  // ล็อก scroll พื้นหลังตอน modal เปิด + ชดเชยความกว้าง scrollbar กันพื้นหลังขยับ
  // (ref-counted: popup ซ้อนกันได้ ปลดล็อกเมื่อทุกตัวปิดหมด)
  useEffect(() => {
    if (!isOpen) return;
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // ทุก modal เปิดจาก interaction (ปิดอยู่ตอนโหลดหน้า) เลยไม่มี hydration mismatch;
  // กัน SSR ไว้ด้วย typeof document (server ไม่มี document.body ให้ portal)
  if (!isOpen || typeof document === "undefined") return null;

  // portal ไป document.body — ไม่โดน ancestor ที่มี transform/filter/backdrop
  // ดึงตำแหน่ง fixed เพี้ยน (เช่น .animate-enter ครอบทั้งหน้า) กลางจอจริงเสมอ
  return createPortal(
    <div className="fixed inset-0 z-50 flex overflow-y-auto p-4 sm:p-6">
      <div
        className="fixed inset-0 bg-black/75"
        onClick={onClose}
      />
      <div
        className={`relative m-auto max-h-[90vh] w-full ${maxWidth} overflow-y-auto rounded-2xl border border-line bg-[#14181d] p-6 shadow-2xl shadow-black/80 ring-1 ring-white/10`}
      >
        <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
          <h3 className="text-base font-bold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
