// Ref-counted body scroll lock.
//
// ความกว้าง layout ไม่ขยับตอน lock เพราะ `scrollbar-gutter: stable` ใน globals.css
// จองที่ scrollbar ไว้ล่วงหน้าแล้ว — เลยไม่ต้องชดเชย padding-right ด้วย JS
// (การชดเชยทีหลัง paint คือสาเหตุที่พื้นหลังขยับนิดนึงตอนเปิด popup)
// The counter keeps the lock until EVERY modal is closed (AccountDetail +
// PetDetail can stack) and absorbs React StrictMode double-effects.

let locks = 0;
let prevOverflow = "";

export function lockBodyScroll(): void {
  if (typeof document === "undefined") return;
  if (locks === 0) {
    prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  locks += 1;
}

export function unlockBodyScroll(): void {
  if (typeof document === "undefined") return;
  locks = Math.max(0, locks - 1);
  if (locks === 0) {
    document.body.style.overflow = prevOverflow;
  }
}
