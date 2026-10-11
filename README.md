# DPP — Dashboard Personal Planning

เปิด `index.html` ได้เลย (ไม่ต้องมี server) · บัญชีทดลอง: `demo@dpp.com` / `demo1234`

## โครงสร้างไฟล์ — แก้หน้าไหน เปิดไฟล์นั้น
| หน้า | HTML | CSS | JS |
|---|---|---|---|
| เข้าสู่ระบบ / สมัคร / ลืมรหัสผ่าน | `index.html` | `css/login.css` | `js/login.js` |
| แดชบอร์ด | `pages/dashboard.html` | `css/dashboard.css` | `js/dashboard.js` |
| รายรับ–รายจ่าย | `pages/transactions.html` | `css/transactions.css` | `js/transactions.js` |
| เป้าหมายการออม | `pages/goals.html` | `css/goals.css` | `js/goals.js` |
| วางแผนงบประมาณ | `pages/budget.html` | `css/budget.css` | `js/budget.js` |
| บัญชีส่วนตัว | `pages/profile.html` | `css/profile.css` | `js/profile.js` |

ใช้ร่วมกันทุกหน้า
- `css/theme.css` — **สี/ฟอนต์/ระยะ (ตัวแปรที่ `:root`)**, เมนูด้านบน, ปุ่ม, ฟอร์ม, การ์ด, modal, toast
- `js/app.js` — ข้อมูล (State/localStorage), ล็อกอิน, หมวดหมู่, ฟอร์มเพิ่มรายการ, helper
- `js/nav.js` — เมนูด้านบน (เพิ่ม/เปลี่ยนชื่อเมนูที่ `Nav.items`)

## เปลี่ยนสีทั้งเว็บ
แก้ตัวแปร `--indigo-*` (สีหลัก) และ `--sky-*` (สีเน้น) ที่ต้นไฟล์ `css/theme.css`

## หมายเหตุ
- เป็นต้นแบบ Frontend: ข้อมูลเก็บใน localStorage ของเบราว์เซอร์ แยกตามผู้ใช้ (ยังไม่มี backend)
- "ลืมรหัสผ่าน" ตั้งรหัสใหม่ได้ทันทีเพราะยังไม่มีระบบส่งอีเมลจริง
