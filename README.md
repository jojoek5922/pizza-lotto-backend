# Pizza Shop Backend (Starter Kit)

Backend เล็กๆ สำหรับให้แอดมิน "กดรับออเดอร์" แล้วปลดล็อกให้ลูกค้าดาวน์โหลดใบเสร็จได้
แยกเป็นคนละ service กับ pizza-lotto-backend เดิม กันชนกัน

## ขั้นตอนที่ 1 — รันทดสอบในเครื่อง

```bash
npm install
cp .env.example .env
# แก้ ADMIN_PIN ใน .env เป็นรหัสที่ต้องการ
npm start
```

เซิร์ฟเวอร์รันที่ `http://localhost:3001`

## ขั้นตอนที่ 2 — Deploy ขึ้น Render (เหมือนที่ทำกับ pizza-lotto-backend)

1. สร้าง repo ใหม่บน GitHub อัปโหลดไฟล์ชุดนี้ (`server.js`, `package.json`, `.env.example`, `admin.html`, `README.md`)
2. ไปที่ render.com → New → Web Service → เชื่อมกับ repo นี้
3. ตั้งค่า:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment Variable: เพิ่ม `ADMIN_PIN` ใส่รหัสที่ต้องการ
4. Deploy เสร็จจะได้ URL เช่น `https://pizza-shop-backend.onrender.com`

## ขั้นตอนที่ 3 — แก้ URL ในไฟล์ที่เกี่ยวข้อง

- ใน `admin.html` แก้บรรทัด `const BACKEND_URL = '...'` ให้เป็น URL จริงที่ deploy ได้
- ใน `pizza-shop.html` (หน้าลูกค้า) ก็ต้องแก้ `BACKEND_URL` ให้ตรงกันด้วย (ผมแก้ให้แล้วในไฟล์ที่ส่งไป — เช็คว่าตรงกับ URL จริงของคุณ)

## ขั้นตอนที่ 4 — เปิดหน้าแอดมิน

เปิด `admin.html` (อัปโหลดขึ้น Netlify แยกอีกเว็บนึงก็ได้ หรือเปิดจากเครื่องตรงๆ) ใส่ PIN ที่ตั้งไว้ → เห็นรายการออเดอร์ทั้งหมด กด "รับออเดอร์" ได้เลย

⚠️ **ข้อควรระวังเรื่องความปลอดภัย**: ระบบ PIN นี้เป็นการป้องกันแบบพื้นฐานมากๆ (MVP) เหมาะกับทดสอบ/ร้านเล็ก ถ้าจะใช้งานจริงจังแนะนำอัปเกรดเป็นระบบ login ที่ปลอดภัยกว่านี้ในอนาคต (เช่น JWT + hashed password)

## โครงสร้างไฟล์

- `server.js` — เซิร์ฟเวอร์หลัก (สร้างออเดอร์, แอดมินดู/รับออเดอร์, ลูกค้าเช็คสถานะ)
- `admin.html` — หน้าแอดมินสำหรับดูและรับออเดอร์
- `shop-orders.json` — จะถูกสร้างอัตโนมัติตอนรันครั้งแรก (เก็บข้อมูลออเดอร์)
- `.env` — เก็บรหัส PIN (ห้าม commit ขึ้น git)
