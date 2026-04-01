# Edara | إدارة

نظام لإدارة **المخزون والمبيعات** داخل **مساحات عمل (Workspaces)** بواجهة عربية (RTL) ودعم صلاحيات المستخدمين.

---

## نظرة سريعة
**Edara | إدارة** بيساعدك تتابع:
- المنتجات والمخزون (إضافة/تعديل/حذف + البحث والتصفية)
- بيع جديد سريع (اختيار منتج + تحديد كمية)
- المبيعات (عرض اليوم/كل المبيعات/بحث بالتاريخ)
- مخزون منخفض وتنبيهات
- لوحة تحكم (إحصائيات + شارت المبيعات)
- إدارة المستخدمين (للأدمن فقط)

---

## المميزات
- واجهة عربية RTL بتنسيق `ar-EG`
- Workspaces: كل ساحة عمل مستقلة ببياناتها
- صلاحيات Roles:
  - **Admin**: لوحة التحكم + المستخدمين + كل الصلاحيات
  - **Worker**: المنتجات + المبيعات + مخزون منخفض (بدون Dashboard/Users)
- Responsive للموبايل والديسكتوب
- Dark Theme باستخدام Bootstrap (`data-bs-theme="dark"`)
- Charts باستخدام Chart.js (`react-chartjs-2`)
- Axios + Interceptors للتعامل مع التوكن وطلبات الـ API
- Context API لإدارة الحالة

---

## التقنيات المستخدمة
### Frontend
- React + Vite
- React Router
- Bootstrap 5 + Bootstrap Icons
- Chart.js + react-chartjs-2
- Axios
- Context API

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication + tokenVersion invalidation
- Swagger / OpenAPI

---

## تشغيل المشروع (Frontend)

### 1) تثبيت الحزم
```bash
npm install
```

### 2) تشغيل المشروع
```bash
npm run dev
```

غالبًا هيشتغل على:
`http://localhost:5173`

---

## إعداد API Base URL
تأكد إن `axios baseURL` بيشاور على الباك إند.

مثال شائع:
`http://localhost:5000/api`

لو بتستخدم Vite env:

1) اعمل ملف `.env` داخل **frontend**:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

2) استخدمه في إعداد Axios:
```js
const baseURL = import.meta.env.VITE_API_BASE_URL;
```

---

## الصفحات الأساسية
- تسجيل الدخول: `/login`
- إنشاء ساحة عمل: `/signup`
- المنتجات: `/products`
- بيع جديد: `/sales/new`
- المبيعات: `/sales`
- مخزون منخفض: `/products/low-stock`
- لوحة التحكم (Admin فقط): `/dashboard`
- المستخدمين (Admin فقط): `/users`

---

## الصلاحيات
- **Admin**: Dashboard + Users + كل الصفحات
- **Worker**: Products + Sales + Low Stock (بدون Dashboard/Users)

---

## لوحة التحكم (Dashboard)
- إحصائيات عامة
- شارت اتجاه المبيعات
- حالة المخزون (متوفر / منخفض / نفد)

---

## التطوير والدعم
**Developed by Yasser Khaled Fath Elbab**  
للدعم أو المشاكل: **01100150673**

---

## الإصدار
الإصدار الحالي: **v1.0.0**
