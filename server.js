/**
 * Pizza Lotto — Payment Backend (starter kit)
 * ---------------------------------------------
 * ทำหน้าที่:
 *  1. สร้าง PromptPay charge ผ่าน Opn (Omise) API เมื่อลูกค้ากดจ่าย
 *  2. รับ Webhook จาก Opn เมื่อเงินเข้าจริง แล้วอัปเดตสถานะตั๋ว
 *  3. ให้หน้าเว็บ (frontend) เช็คสถานะตั๋วว่าจ่ายแล้วหรือยัง
 *
 * ก่อนใช้งาน:
 *  1. npm install
 *  2. คัดลอก .env.example เป็น .env แล้วใส่คีย์จริงจาก Opn dashboard
 *  3. npm start  (รันทดสอบในเครื่อง) หรือ deploy ขึ้น Render/Railway
 *  4. เอา URL ที่ deploy ได้ + "/webhook/opn" ไปตั้งเป็น Webhook endpoint
 *     ในหน้า Opn Dashboard > Webhooks
 *
 * หมายเหตุสำคัญ:
 *  - ต้องอีเมลขอเปิดใช้ PromptPay กับ Opn ก่อน (support@opn.ooo) ถึงจะสร้าง
 *    charge แบบ source[type]=promptpay ได้จริงบน production
 *  - amount ของ Omise API เป็นหน่วย "สตางค์" (บาท x 100) เช่น 30 บาท = 3000
 *  - โครงสร้าง response ของ Omise อาจมีการอัปเดตเป็นระยะ แนะนำให้ console.log
 *    response ตอน test จริงเพื่อยืนยัน field ก่อนใช้งานจริง (ดู README.md)
 *  - ระบบเก็บสถานะตั๋วแบบไฟล์ JSON ง่ายๆ (orders.json) เหมาะกับทดสอบ/ร้านเล็ก
 *    ถ้าจะใช้งานจริงจัง แนะนำย้ายไปใช้ฐานข้อมูลจริง (Postgres/MongoDB) ภายหลัง
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
// อนุญาตให้หน้าเว็บ (ที่อาจอยู่คนละโดเมน) เรียก API นี้ได้ — ปรับ origin ให้แคบลงตอนใช้งานจริง
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const OMISE_SECRET_KEY = process.env.OMISE_SECRET_KEY;
const ORDERS_FILE = path.join(__dirname, 'orders.json');

// ---------- เก็บ/อ่านสถานะตั๋วแบบไฟล์ JSON ง่ายๆ ----------
function readOrders() {
  if (!fs.existsSync(ORDERS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
  } catch {
    return {};
  }
}
function writeOrders(data) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(data, null, 2));
}

// ---------- 1) สร้าง PromptPay charge ----------
// POST /api/create-charge   body: { ticketNo, amountBaht }
app.post('/api/create-charge', async (req, res) => {
  try {
    const { ticketNo, amountBaht } = req.body;
    if (!ticketNo || !amountBaht || amountBaht <= 0) {
      return res.status(400).json({ error: 'ต้องระบุ ticketNo และ amountBaht ที่มากกว่า 0' });
    }

    const amountSatang = Math.round(amountBaht * 100);

    const params = new URLSearchParams();
    params.append('amount', String(amountSatang));
    params.append('currency', 'THB');
    params.append('source[type]', 'promptpay');
    params.append('metadata[ticket_no]', ticketNo);

    const authHeader = 'Basic ' + Buffer.from(`${OMISE_SECRET_KEY}:`).toString('base64');

    const omiseRes = await fetch('https://api.omise.co/charges', {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const charge = await omiseRes.json();
    if (!omiseRes.ok) {
      console.error('Omise error:', charge);
      return res.status(502).json({ error: 'สร้างรายการชำระเงินไม่สำเร็จ', detail: charge });
    }

    // บันทึกสถานะเริ่มต้นของตั๋วนี้ไว้เป็น "pending"
    const orders = readOrders();
    orders[ticketNo] = {
      chargeId: charge.id,
      amountBaht,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    writeOrders(orders);

    // NOTE: ตำแหน่งรูป QR ใน response อาจอยู่ที่ charge.source.scannable_code.image.download_uri
    // แนะนำ console.log(charge) ดูโครงสร้างจริงก่อน แล้วค่อยปรับบรรทัดด้านล่างให้ตรง
    const qrImageUrl = charge?.source?.scannable_code?.image?.download_uri || null;

    res.json({
      chargeId: charge.id,
      status: charge.status,
      qrImageUrl
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดฝั่งเซิร์ฟเวอร์' });
  }
});

// ---------- 2) รับ Webhook จาก Opn ----------
// POST /webhook/opn
app.post('/webhook/opn', (req, res) => {
  // ตอบ 200 ให้เร็วที่สุดก่อน เพื่อไม่ให้ Opn ยิงซ้ำ แล้วค่อยประมวลผลต่อ
  res.sendStatus(200);

  try {
    const event = req.body;
    console.log('Webhook received:', event?.key);

    // event ที่สนใจคือรายการชำระเงินสำเร็จ
    if (event?.key === 'charge.complete') {
      const charge = event.data;
      if (charge.status === 'successful') {
        const ticketNo = charge?.metadata?.ticket_no;
        if (ticketNo) {
          const orders = readOrders();
          if (orders[ticketNo]) {
            orders[ticketNo].status = 'paid';
            orders[ticketNo].paidAt = new Date().toISOString();
            writeOrders(orders);
            console.log(`✅ Ticket ${ticketNo} ชำระเงินสำเร็จ`);
          }
        }
      }
    }
  } catch (err) {
    console.error('Webhook processing error:', err);
  }
});

// ---------- 3) ให้หน้าเว็บเช็คสถานะตั๋ว ----------
// GET /api/ticket/:ticketNo/status
app.get('/api/ticket/:ticketNo/status', (req, res) => {
  const orders = readOrders();
  const order = orders[req.params.ticketNo];
  if (!order) return res.status(404).json({ status: 'not_found' });
  res.json({ status: order.status, amountBaht: order.amountBaht, paidAt: order.paidAt || null });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
