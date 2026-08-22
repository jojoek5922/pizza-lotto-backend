/**
 * Pizza Shop — Order Backend (starter kit)
 * ---------------------------------------------
 * ทำหน้าที่:
 *  1. รับออเดอร์จากหน้าเว็บลูกค้า (สถานะเริ่มต้น "pending")
 *  2. ให้แอดมินดูรายการออเดอร์ + กด "รับออเดอร์" (สถานะเปลี่ยนเป็น "accepted")
 *  3. ให้หน้าเว็บลูกค้าเช็คสถานะ — พอแอดมินรับแล้วถึงปลดล็อกปุ่มดาวน์โหลดใบเสร็จ
 *
 * นี่คือ backend แยกต่างหาก ไม่เกี่ยวกับ pizza-lotto-backend เดิม (กันชนกัน)
 *
 * ก่อนใช้งาน:
 *  1. npm install
 *  2. คัดลอก .env.example เป็น .env แล้วตั้ง ADMIN_PIN เป็นรหัสที่ต้องการ
 *  3. npm start (ทดสอบในเครื่อง) หรือ deploy ขึ้น Render (ขั้นตอนเหมือนที่ทำกับ pizza-lotto-backend)
 *
 * หมายเหตุ: เก็บสถานะแบบไฟล์ JSON ง่ายๆ (shop-orders.json) เหมาะกับร้านเล็ก/ทดสอบ
 * ถ้าออเดอร์เยอะมากแนะนำย้ายไปใช้ฐานข้อมูลจริงภายหลัง
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Pin');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const ADMIN_PIN = process.env.ADMIN_PIN || '1234';
const ORDERS_FILE = path.join(__dirname, 'shop-orders.json');

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

function requireAdmin(req, res, next) {
  const pin = req.header('X-Admin-Pin') || req.query.pin;
  if (pin !== ADMIN_PIN) {
    return res.status(401).json({ error: 'รหัสแอดมินไม่ถูกต้อง' });
  }
  next();
}

// ---------- 1) ลูกค้าสร้างออเดอร์ ----------
// POST /api/shop/orders  body: { orderNo, tables, total, totalQty, notes, name, phone, date, time }
app.post('/api/shop/orders', (req, res) => {
  const order = req.body;
  if (!order.orderNo) {
    return res.status(400).json({ error: 'ต้องระบุ orderNo' });
  }
  const orders = readOrders();
  orders[order.orderNo] = {
    ...order,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  writeOrders(orders);
  res.json({ ok: true, orderNo: order.orderNo, status: 'pending' });
});

// ---------- 2) แอดมิน: ดูรายการออเดอร์ ----------
// GET /api/shop/orders?pin=xxxx
app.get('/api/shop/orders', requireAdmin, (req, res) => {
  const orders = readOrders();
  const list = Object.values(orders).sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  );
  res.json(list);
});

// ---------- 3) แอดมิน: กดรับออเดอร์ ----------
// POST /api/shop/orders/:orderNo/accept?pin=xxxx
app.post('/api/shop/orders/:orderNo/accept', requireAdmin, (req, res) => {
  const orders = readOrders();
  const order = orders[req.params.orderNo];
  if (!order) return res.status(404).json({ error: 'ไม่พบออเดอร์นี้' });
  order.status = 'accepted';
  order.acceptedAt = new Date().toISOString();
  writeOrders(orders);
  res.json({ ok: true, status: 'accepted' });
});

// ---------- 3b) แอดมิน: กดไม่รับออเดอร์นี้ ----------
// POST /api/shop/orders/:orderNo/reject?pin=xxxx
app.post('/api/shop/orders/:orderNo/reject', requireAdmin, (req, res) => {
  const orders = readOrders();
  const order = orders[req.params.orderNo];
  if (!order) return res.status(404).json({ error: 'ไม่พบออเดอร์นี้' });
  order.status = 'rejected';
  order.rejectedAt = new Date().toISOString();
  writeOrders(orders);
  res.json({ ok: true, status: 'rejected' });
});

// ---------- 4) ลูกค้า: เช็คสถานะออเดอร์ ----------
// GET /api/shop/orders/:orderNo/status
app.get('/api/shop/orders/:orderNo/status', (req, res) => {
  const orders = readOrders();
  const order = orders[req.params.orderNo];
  if (!order) return res.status(404).json({ status: 'not_found' });
  res.json({ status: order.status });
});

// ---------- 5) ลูกค้า: ดึงออเดอร์ของตัวเองด้วยเบอร์โทร (ไว้กู้สถานะตอนรีเฟรช/เปิดใหม่) ----------
// GET /api/shop/orders/by-phone/:phone
// คืนเฉพาะออเดอร์ใน 24 ชม.ล่าสุดของเบอร์นั้น กันไม่ให้ค้างแสดงออเดอร์เก่าๆ ตลอดไป
app.get('/api/shop/orders/by-phone/:phone', (req, res) => {
  const orders = readOrders();
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const list = Object.values(orders)
    .filter(o => o.phone === req.params.phone && new Date(o.createdAt).getTime() >= cutoff)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(list);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Pizza Shop backend running on port ${PORT}`));
