const exactErrorMap = {
  "workspaceName, name, email, password are required": "اسم المحل والاسم والبريد الإلكتروني وكلمة المرور مطلوبة",
  "Password must be at least 6 characters": "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
  "Email already exists": "البريد الإلكتروني مستخدم بالفعل",
  "email and password are required": "البريد الإلكتروني وكلمة المرور مطلوبان",
  "Invalid credentials": "بيانات الدخول غير صحيحة",
  "User is disabled": "هذا المستخدم معطل",
  "Logged out successfully": "تم تسجيل الخروج بنجاح",

  Unauthorized: "غير مصرح لك",
  "Unauthorized: Missing token": "غير مصرح لك: رمز الدخول غير موجود",
  "Unauthorized: Invalid token": "غير مصرح لك: رمز الدخول غير صالح",
  "Unauthorized: Invalid token payload": "غير مصرح لك: بيانات رمز الدخول غير صالحة",
  "Unauthorized: User not found": "غير مصرح لك: المستخدم غير موجود",
  "Unauthorized: Token workspace mismatch": "غير مصرح لك: رمز الدخول لا يطابق مساحة العمل",
  "Session expired, please login again": "انتهت الجلسة، برجاء تسجيل الدخول مرة أخرى",
  Forbidden: "ليس لديك صلاحية لتنفيذ هذا الإجراء",
  "Forbidden: User is disabled": "ليس لديك صلاحية: المستخدم معطل",
  "Forbidden: Admins only": "ليس لديك صلاحية: هذا الإجراء للمدير فقط",

  "Invoice code already exists": "كود الفاتورة مستخدم بالفعل",
  "invoiceCode is required": "كود الفاتورة مطلوب",
  "Invoice code is required": "كود الفاتورة مطلوب",
  "Invoice not found": "الفاتورة غير موجودة",
  "Invalid invoice id": "معرّف الفاتورة غير صالح",
  "Invoice has no items": "الفاتورة لا تحتوي على أصناف",
  "Only draft invoices can be finalized": "يمكن اعتماد الفواتير المسودة فقط",
  "Only finalized invoices can be printed": "يمكن طباعة الفواتير المعتمدة فقط",
  "You can only edit items on draft invoices": "يمكن تعديل الأصناف في الفواتير المسودة فقط",
  "You can only edit discounts on draft invoices": "يمكن تعديل الخصومات في الفواتير المسودة فقط",

  "Product not found": "المنتج غير موجود",
  "Product ID already exists": "كود المنتج مستخدم بالفعل",
  "New Product ID already exists": "كود المنتج الجديد مستخدم بالفعل",
  "Product ID is required": "كود المنتج مطلوب",
  "Product name is required": "اسم المنتج مطلوب",
  "Product category is required": "قسم المنتج مطلوب",
  "Purchase price is required": "سعر الشراء مطلوب",
  "Sale price is required": "سعر البيع مطلوب",
  "Purchase price cannot be negative": "سعر الشراء لا يمكن أن يكون أقل من صفر",
  "Sale price cannot be negative": "سعر البيع لا يمكن أن يكون أقل من صفر",
  "Quantity cannot be negative": "الكمية لا يمكن أن تكون أقل من صفر",
  "minStock cannot be negative": "الحد الأدنى للمخزون لا يمكن أن يكون أقل من صفر",
  "ID or Name is required": "الكود أو الاسم مطلوب",
  "productId/id or name is required": "كود المنتج أو اسم المنتج مطلوب",
  "Name does not match this product id": "الاسم لا يطابق كود المنتج",
  "Multiple products have the same name. Please choose one.": "يوجد أكثر من منتج بنفس الاسم، اختر المنتج الصحيح",
  "Multiple products have the same name. Please choose one by productId.": "يوجد أكثر من منتج بنفس الاسم، اختر المنتج بالكود",

  "quantity must be a positive integer": "الكمية يجب أن تكون رقمًا صحيحًا أكبر من صفر",
  "purchasePrice must be a non-negative number": "سعر الشراء يجب أن يكون رقمًا أكبر من أو يساوي صفر",
  "salePrice must be a non-negative number": "سعر البيع يجب أن يكون رقمًا أكبر من أو يساوي صفر",
  "newSalePrice must be a non-negative number": "سعر البيع الجديد يجب أن يكون رقمًا أكبر من أو يساوي صفر",
  "newSalePrice is required when priceMode=merge_update": "سعر البيع الجديد مطلوب عند اختيار دمج وتحديث المنتج الحالي",
  "priceMode must be same, new_product, or merge_update": "طريقة التعامل مع السعر غير صحيحة",
  "merge_update is allowed only for existing products": "الدمج وتحديث السعر متاح للمنتجات الموجودة فقط",

  "newQuantity is the same as current quantity": "الكمية الجديدة تساوي الكمية الحالية، أدخل كمية مختلفة للحفظ",
  "newQuantity must be an integer >= 0": "الكمية الجديدة يجب أن تكون رقمًا صحيحًا أكبر من أو يساوي صفر",
  "delta must be a non-zero integer": "مقدار الزيادة أو النقص يجب أن يكون رقمًا صحيحًا لا يساوي صفر",
  "Resulting quantity cannot be negative": "الكمية الناتجة لا يمكن أن تكون أقل من صفر",
  "Stock changed. Please retry.": "تم تغيير المخزون، برجاء المحاولة مرة أخرى",
  "Stock changed. Please retry finalize.": "تم تغيير المخزون، برجاء محاولة الاعتماد مرة أخرى",
  "Insufficient quantity in inventory": "الكمية المتاحة في المخزون غير كافية",
  "note is required for reason=correction or other": "الملاحظة مطلوبة عند اختيار سبب تصحيح أو أخرى",

  "Supplier not found": "المورد غير موجود",
  "Supplier is archived": "المورد مؤرشف",
  "Supplier name is required": "اسم المورد مطلوب",
  "Supplier already exists": "المورد موجود بالفعل",
  "Supplier name already exists": "اسم المورد موجود بالفعل",
  "Invalid supplier id": "معرّف المورد غير صالح",
  "Invalid supplierId": "معرّف المورد غير صالح",
  "supplierId or supplierName is required": "يجب اختيار مورد أو كتابة اسم مورد",

  "Returns are allowed only for finalized invoices": "يمكن إنشاء مرتجع للفواتير المعتمدة فقط",
  "qtyReturned must be a positive integer": "كمية المرتجع يجب أن تكون رقمًا صحيحًا أكبر من صفر",
  "qtyReturned exceeds available return quantity": "كمية المرتجع أكبر من الكمية المتاحة للإرجاع",
  "returnStockStatus must be restocked or damaged": "حالة المرتجع يجب أن تكون رجع للمخزون أو تالف",
  "items cannot be empty": "الأصناف لا يمكن أن تكون فارغة",
  "Return not found": "المرتجع غير موجود",
  "Invalid return id": "معرّف المرتجع غير صالح",

  "Workspace not found": "مساحة العمل غير موجودة",
  "Workspace not found for this user": "مساحة العمل غير موجودة لهذا المستخدم",
  "Workspace name is required": "اسم المحل مطلوب",
  "Workspace name must be at least 2 characters": "اسم المحل يجب أن يكون حرفين على الأقل",
  "Workspace name must be at most 60 characters": "اسم المحل يجب ألا يزيد عن 60 حرفًا",
  "Only workspace owner can delete it": "يمكن لمالك مساحة العمل فقط حذفها",
  "Workspace deleted permanently": "تم حذف مساحة العمل نهائيًا",

  "User not found": "المستخدم غير موجود",
  "User id is required": "معرّف المستخدم مطلوب",
  "User not in your workspace": "المستخدم ليس ضمن مساحة العمل الخاصة بك",
  "You cannot change your own status": "لا يمكنك تغيير حالة حسابك بنفسك",
  "You cannot change the workspace owner status": "لا يمكنك تغيير حالة مالك مساحة العمل",
  "You cannot disable the last admin in this workspace": "لا يمكنك تعطيل آخر مدير في مساحة العمل",
  "You cannot delete your own account": "لا يمكنك حذف حسابك بنفسك",
  "You cannot delete the workspace owner": "لا يمكنك حذف مالك مساحة العمل",
  "You cannot delete the last active admin in this workspace": "لا يمكنك حذف آخر مدير نشط في مساحة العمل",
  "Discount limits updated": "تم تحديث حدود الخصم",
  "User deleted permanently": "تم حذف المستخدم نهائيًا",
};

const fieldNameMap = {
  invoiceCode: "كود الفاتورة",
  product: "المنتج",
  productId: "كود المنتج",
  id: "الكود",
  name: "الاسم",
  category: "القسم",
  purchasePrice: "سعر الشراء",
  salePrice: "سعر البيع",
  newSalePrice: "سعر البيع الجديد",
  quantity: "الكمية",
  newQuantity: "الكمية الجديدة",
  delta: "مقدار الزيادة أو النقص",
  minStock: "الحد الأدنى للمخزون",
  supplier: "المورد",
  supplierId: "المورد",
  supplierName: "اسم المورد",
  status: "الحالة",
  priceMode: "طريقة التعامل مع السعر",
  email: "البريد الإلكتروني",
  password: "كلمة المرور",
  workspace: "مساحة العمل",
  workspaceName: "اسم المحل",
  user: "المستخدم",
  items: "الأصناف",
  note: "الملاحظة",
  reason: "السبب",
  date: "التاريخ",
  from: "تاريخ البداية",
  to: "تاريخ النهاية",
};

const genericHttpMap = {
  400: "البيانات المرسلة غير صحيحة، برجاء مراجعتها والمحاولة مرة أخرى",
  401: "غير مصرح لك، برجاء تسجيل الدخول مرة أخرى",
  403: "ليس لديك صلاحية لتنفيذ هذا الإجراء",
  404: "العنصر المطلوب غير موجود",
  409: "يوجد تعارض في البيانات، برجاء مراجعتها والمحاولة مرة أخرى",
  422: "البيانات غير صالحة، برجاء مراجعتها",
  500: "حدث خطأ في الخادم، برجاء المحاولة لاحقًا",
};

function hasEnglishLetters(value) {
  return /[A-Za-z]/.test(String(value || ""));
}

function cleanText(value) {
  return String(value || "").trim();
}

function translatePattern(message) {
  const msg = cleanText(message);

  if (!msg) return "";
  if (exactErrorMap[msg]) return exactErrorMap[msg];

  if (msg.startsWith("Field '") && msg.endsWith("' is not allowed")) {
    const field = msg.slice(7, -16);
    return `الحقل ${fieldNameMap[field] || field} غير مسموح به`;
  }

  if (msg.startsWith("Product not found:")) {
    const productId = msg.split(":").slice(1).join(":").trim();
    return productId ? `المنتج غير موجود: ${productId}` : "المنتج غير موجود";
  }

  if (msg.startsWith("Max allowed is ")) {
    return msg.replace("Max allowed is ", "الحد الأقصى المسموح هو ");
  }

  if (msg.startsWith("reason must be one of:")) {
    return "سبب التسوية غير صحيح";
  }

  if (msg.includes("must be a non-zero integer")) {
    return "القيمة يجب أن تكون رقمًا صحيحًا لا يساوي صفر";
  }

  if (msg.includes("must be a positive integer")) {
    return "القيمة يجب أن تكون رقمًا صحيحًا أكبر من صفر";
  }

  if (msg.includes("must be a non-negative number")) {
    return "القيمة يجب أن تكون رقمًا أكبر من أو يساوي صفر";
  }

  if (msg.includes("must be a valid number")) {
    return "القيمة يجب أن تكون رقمًا صحيحًا";
  }

  if (msg.includes("must be between 0 and 100")) {
    return "القيمة يجب أن تكون بين 0 و 100";
  }

  if (msg.includes("must be an integer >= 0")) {
    return "القيمة يجب أن تكون رقمًا صحيحًا أكبر من أو يساوي صفر";
  }

  if (msg.includes("cannot be negative")) {
    return "القيمة لا يمكن أن تكون أقل من صفر";
  }

  if (msg.endsWith("is required")) {
    const field = msg.replace(/\s*is required$/, "");
    return `${fieldNameMap[field] || field} مطلوب`;
  }

  if (hasEnglishLetters(msg)) {
    return "حدث خطأ أثناء تنفيذ العملية، برجاء مراجعة البيانات والمحاولة مرة أخرى";
  }

  return msg;
}

function pushString(candidates, value) {
  const text = cleanText(value);
  if (text) candidates.push(text);
}

function pushObjectValues(candidates, obj) {
  if (!obj || typeof obj !== "object") return;

  if (typeof obj.message === "string") pushString(candidates, obj.message);
  if (typeof obj.error === "string") pushString(candidates, obj.error);

  for (const [field, value] of Object.entries(obj)) {
    if (field === "message" || field === "error") continue;

    if (typeof value === "string") {
      const label = fieldNameMap[field];
      const translated = translatePattern(value);
      pushString(candidates, label && !translated.startsWith(label) ? `${label}: ${translated}` : translated);
    } else if (Array.isArray(value)) {
      const firstText = value.find((x) => typeof x === "string");
      if (firstText) {
        const label = fieldNameMap[field];
        const translated = translatePattern(firstText);
        pushString(candidates, label && !translated.startsWith(label) ? `${label}: ${translated}` : translated);
      }
    }
  }
}

export function translateApiError(errorOrMessage, fallback = "حدث خطأ غير متوقع") {
  if (typeof errorOrMessage === "string") {
    return translatePattern(errorOrMessage) || fallback;
  }

  const status = errorOrMessage?.response?.status;
  const body = errorOrMessage?.response?.data;
  const candidates = [];

  pushObjectValues(candidates, body?.data);
  pushObjectValues(candidates, body?.errors);
  pushString(candidates, body?.message);
  pushString(candidates, body?.error);
  pushString(candidates, errorOrMessage?.userMessage);
  pushString(candidates, errorOrMessage?.message);

  const raw = candidates.find((x) => cleanText(x)) || genericHttpMap[status] || fallback;
  const translated = translatePattern(raw);

  if (translated && !hasEnglishLetters(translated)) return translated;
  return genericHttpMap[status] || fallback;
}
