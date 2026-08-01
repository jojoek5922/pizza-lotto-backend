# Pizza Lotto Backend (Starter Kit)

Backend เล็กๆ สำหรับต่อ Payment Gateway (Opn/Omise) + Webhook ให้กับเว็บ Pizza Lotto
ทำหน้าที่ 3 อย่าง: สร้าง QR PromptPay ที่ผูกกับยอดเงินจริง, รับ webhook ยืนยันการจ่ายเงินอัตโนมัติ,
และให้หน้าเว็บเช็คได้ว่าตั๋วไหนจ่ายแล้วบ้าง

## ขั้นตอนที่ 1 — สมัคร Opn Payments

1. ไปที่ https://www.opn.ooo/th-th/ → กด "เริ่มสมัครใช้บริการ"
2. กรอกข้อมูลแบบบุคคลธรรมดา (ใช้บัตรประชาชน + สมุดบัญชีธนาคารตัวเอง)
3. เมื่อบัญชีอนุมัติแล้ว เข้า Dashboard → Keys จะเจอ **Secret Key** (`skey_test_...` สำหรับทดสอบ,
   `skey_live_...` สำหรับใช้งานจริง)
4. **สำคัญ**: ส่งอีเมลไปที่ support@opn.ooo ขอเปิดใช้ฟีเจอร์ PromptPay ให้กับบัญชี
   (ต้องรีวิวและยอมรับเงื่อนไขเพิ่มเติมก่อนใช้งานจริงได้)

## ขั้นตอนที่ 2 — รันทดสอบในเครื่องตัวเอง

```bash
npm install
cp .env.example .env
# แก้ .env ใส่ OMISE_SECRET_KEY ที่ได้จากขั้นตอนที่ 1
npm start
```

เซิร์ฟเวอร์จะรันที่ `http://localhost:3000`

ทดสอบสร้าง charge:
```bash
curl -X POST http://localhost:3000/api/create-charge \
  -H "Content-Type: application/json" \
  -d '{"ticketNo":"773429","amountBaht":30}'
```

**ก่อนใช้งานจริง**: ลอง `console.log(charge)` ใน server.js ดูโครงสร้าง response จริงจาก Omise
ก่อน เพราะ field ชื่อ `qrImageUrl` (ตำแหน่งรูป QR) อาจมีการเปลี่ยนแปลงได้ตามเวอร์ชัน API —
เช็คกับเอกสารล่าสุดที่ https://docs.opn.ooo/promptpay เทียบกับโค้ดใน server.js

## ขั้นตอนที่ 3 — Deploy ขึ้น Render (ฟรี เริ่มต้นง่าย)

1. สร้าง repo บน GitHub แล้วอัปโหลดโค้ดชุดนี้ขึ้นไป (**อย่า** อัปโหลดไฟล์ `.env`)
2. ไปที่ https://render.com → สมัคร/ล็อกอิน → New → Web Service
3. เชื่อมกับ repo GitHub ที่สร้างไว้
4. ตั้งค่า:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment Variable: เพิ่ม `OMISE_SECRET_KEY` ใส่ค่าจริง
5. กด Deploy — Render จะให้ URL แบบ `https://your-app.onrender.com` มา (มี HTTPS ให้อัตโนมัติ)

*ทางเลือกอื่น*: Railway.app ก็ใช้งานคล้ายกัน ขั้นตอนใกล้เคียงกัน

## ขั้นตอนที่ 4 — ตั้งค่า Webhook ที่ Opn Dashboard

1. เข้า Opn Dashboard → Webhooks
2. เพิ่ม endpoint ใหม่: `https://your-app.onrender.com/webhook/opn`
3. เลือก event `charge.complete`
4. บันทึก — ทดสอบส่ง test event จาก dashboard เพื่อดูว่า server รับได้ (เช็ค log บน Render)

## ขั้นตอนที่ 5 — ต่อกับหน้าเว็บ (frontend)

ตอนนี้หน้าเว็บ pizza-lotto.html สร้าง QR PromptPay "แบบ static" เอง (ฝัง PromptPay ID ตรงๆ
ไม่ผ่าน backend) เมื่อ backend พร้อมแล้ว ขั้นต่อไปคือแก้ให้หน้าเว็บเรียก
`POST /api/create-charge` แทนการ generate QR เอง แล้วเอา `qrImageUrl` ที่ได้กลับมาโชว์แทน —
วิธีนี้ทำให้ QR แต่ละใบผูกกับ charge จริงที่ตรวจสอบได้ผ่าน webhook

พร้อมจะทำขั้นตอนนี้เมื่อไหร่ (ต่อ frontend เข้ากับ backend จริง) บอกได้เลย พา ทำต่อให้ทันที

## โครงสร้างไฟล์

- `server.js` — โค้ดเซิร์ฟเวอร์หลักทั้งหมด
- `orders.json` — จะถูกสร้างอัตโนมัติตอนรันครั้งแรก (เก็บสถานะตั๋วแบบไฟล์ธรรมดา
  เหมาะกับร้านเล็ก/ทดสอบ ถ้าจำนวนตั๋วเยอะมากแนะนำย้ายไปฐานข้อมูลจริงภายหลัง)
- `.env` — เก็บคีย์ลับ (ห้าม commit ขึ้น git)
