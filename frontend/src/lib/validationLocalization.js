const VALIDATION_TRANSLATIONS = {
  dari: {
    "Validation error": "لطفاً معلومات واردشده را بررسی کنید.",
    "A record with this value already exists.": "این معلومات قبلاً ثبت شده است.",
    "Record not found.": "رکورد مورد نظر یافت نشد.",
    "Database unavailable. Please try again shortly.":
      "دیتابیس فعلاً در دسترس نیست. لطفاً کمی بعد دوباره کوشش کنید.",
    "Internal server error":
      "مشکل تخنیکی رخ داد. لطفاً دوباره کوشش کنید.",
    "Request failed": "درخواست انجام نشد. لطفاً دوباره کوشش کنید.",
    "Phone number and password are required.":
      "شماره تماس و رمز عبور ضروری است.",
    "Invalid credentials.": "شماره تماس یا رمز عبور درست نیست.",
    "Account is deactivated. Contact admin.":
      "این حساب غیرفعال است. لطفاً با مدیر سیستم تماس بگیرید.",
    "Authentication required.": "برای ادامه باید وارد سیستم شوید.",
    "Invalid or expired token.":
      "نشست شما منقضی شده است. لطفاً دوباره وارد شوید.",
    "Session expired. Please sign in again.":
      "نشست شما منقضی شده است. لطفاً دوباره وارد شوید.",
    "You do not have permission to perform this action.":
      "شما اجازه انجام این عمل را ندارید.",
    "Tenant account is suspended.": "این سیستم تعلیق شده است.",
    "Subscription expired.": "اشتراک این سیستم منقضی شده است.",
    "Your secure session check expired. Please try again.":
      "بررسی امنیتی نشست منقضی شد. لطفاً دوباره کوشش کنید.",

    "First name is required": "نام مشتری ضروری است.",
    "Phone number must be at least 7 digits":
      "شماره تماس باید حداقل ۷ رقم باشد.",
    "At least one order item required": "حداقل یک مورد سفارش ضروری است.",
    "clientKey is required": "کلید پیش نویس ضروری است.",
    "Worker role is required": "نقش کارگر ضروری است.",
    "Invalid worker role": "نقش کارگر درست نیست.",
    "Search query is required": "عبارت جستجو ضروری است.",
    "Worker is required": "انتخاب کارگر ضروری است.",
    "Order is required": "انتخاب سفارش ضروری است.",
    "Reason is required": "دلیل ضروری است.",
    "Reason must be 300 characters or less":
      "دلیل باید ۳۰۰ حرف یا کمتر باشد.",
    "Percentage is required": "فیصدی ضروری است.",
    "Percentage must be a number": "فیصدی باید عدد باشد.",
    "Percentage cannot be negative": "فیصدی نمی تواند منفی باشد.",
    "Percentage cannot be greater than 100":
      "فیصدی نمی تواند بیشتر از ۱۰۰ باشد.",
    "Password is required": "رمز عبور ضروری است.",
    "Password must be at least 6 characters":
      "رمز عبور باید حداقل ۶ حرف باشد.",
    "Password is too long": "رمز عبور بیش از حد طولانی است.",
    "Contributor name is required": "نام شریک کار ضروری است.",
    "Contributor father name is required": "نام پدر شریک کار ضروری است.",
    "Sender name is required": "نام فرستنده ضروری است.",
    "Recipient name is required": "نام گیرنده ضروری است.",
    "Amount is required": "مبلغ ضروری است.",
    "Amount must be a number": "مبلغ باید عدد باشد.",
    "Amount must be a valid number": "مبلغ باید یک عدد معتبر باشد.",
    "Amount must be greater than 0": "مبلغ باید بیشتر از صفر باشد.",
    "Date & time is required": "تاریخ و وقت ضروری است.",
    "orderId is required": "انتخاب سفارش ضروری است.",
    "At least one order allocation is required":
      "حداقل یک تخصیص سفارش ضروری است.",
    "Account type is required": "نوع حساب ضروری است.",
    "Invalid account type": "نوع حساب درست نیست.",
    "User is required": "انتخاب کاربر ضروری است.",
    "Transaction date is required": "تاریخ قرض ضروری است.",
    "Amount must be a positive number": "مبلغ باید بیشتر از صفر باشد.",
    "Ton items count must match Ton Quantity":
      "تعداد تان ها باید با مقدار انتخاب شده برابر باشد.",
    "Number of ton items must match tonQuantity":
      "تعداد تان ها باید با مقدار انتخاب شده برابر باشد.",
    "Given money cannot exceed total price":
      "مبلغ پرداخت شده نمی تواند بیشتر از قیمت مجموعی باشد.",
  },
  pashto: {
    "Validation error": "مهرباني وکړئ داخل شوي معلومات وګورئ.",
    "A record with this value already exists.":
      "دا معلومات مخکې ثبت شوي دي.",
    "Record not found.": "غوښتل شوی ریکارډ ونه موندل شو.",
    "Database unavailable. Please try again shortly.":
      "ډیټابیس اوس لاسرسی نه لري. مهرباني وکړئ لږ وروسته بیا هڅه وکړئ.",
    "Internal server error":
      "تخنیکي ستونزه رامنځته شوه. مهرباني وکړئ بیا هڅه وکړئ.",
    "Request failed": "غوښتنه بشپړه نه شوه. مهرباني وکړئ بیا هڅه وکړئ.",
    "Phone number and password are required.":
      "د تلیفون شمېره او رمز اړین دي.",
    "Invalid credentials.": "د تلیفون شمېره یا رمز ناسم دی.",
    "Account is deactivated. Contact admin.":
      "دا حساب غیر فعال دی. مهرباني وکړئ له مدیر سره اړیکه ونیسئ.",
    "Authentication required.": "د دوام لپاره سیستم ته ننوتل اړین دي.",
    "Invalid or expired token.":
      "ستاسې ناسته پای ته رسېدلې ده. مهرباني وکړئ بیا ننوځئ.",
    "Session expired. Please sign in again.":
      "ستاسې ناسته پای ته رسېدلې ده. مهرباني وکړئ بیا ننوځئ.",
    "You do not have permission to perform this action.":
      "تاسې د دې عمل اجازه نه لرئ.",
    "Tenant account is suspended.": "دا سیستم ځنډول شوی دی.",
    "Subscription expired.": "د دې سیستم ګډون پای ته رسېدلی دی.",
    "Your secure session check expired. Please try again.":
      "د خوندي ناستې تایید پای ته ورسېد. مهرباني وکړئ بیا هڅه وکړئ.",

    "First name is required": "د مشتری نوم اړین دی.",
    "Phone number must be at least 7 digits":
      "د تلیفون شمېره باید لږ تر لږه ۷ رقمونه وي.",
    "At least one order item required":
      "لږ تر لږه یو د فرمایش توکی اړین دی.",
    "clientKey is required": "د مسودې کلید اړین دی.",
    "Worker role is required": "د کارګر رول اړین دی.",
    "Invalid worker role": "د کارګر رول سم نه دی.",
    "Search query is required": "د لټون عبارت اړین دی.",
    "Worker is required": "د کارګر ټاکل اړین دي.",
    "Order is required": "د فرمایش ټاکل اړین دي.",
    "Reason is required": "دلیل اړین دی.",
    "Reason must be 300 characters or less":
      "دلیل باید ۳۰۰ توري یا تر دې کم وي.",
    "Percentage is required": "فیصدي اړینه ده.",
    "Percentage must be a number": "فیصدي باید عدد وي.",
    "Percentage cannot be negative": "فیصدي منفي نه شي کېدای.",
    "Percentage cannot be greater than 100":
      "فیصدي له ۱۰۰ څخه زیاته نه شي کېدای.",
    "Password is required": "رمز اړین دی.",
    "Password must be at least 6 characters":
      "رمز باید لږ تر لږه ۶ توري وي.",
    "Password is too long": "رمز ډېر اوږد دی.",
    "Contributor name is required": "د شریک کار نوم اړین دی.",
    "Contributor father name is required": "د شریک کار د پلار نوم اړین دی.",
    "Sender name is required": "د لېږونکي نوم اړین دی.",
    "Recipient name is required": "د ترلاسه کوونکي نوم اړین دی.",
    "Amount is required": "مبلغ اړین دی.",
    "Amount must be a number": "مبلغ باید عدد وي.",
    "Amount must be a valid number": "مبلغ باید سم عدد وي.",
    "Amount must be greater than 0": "مبلغ باید له صفر څخه زیات وي.",
    "Date & time is required": "نېټه او وخت اړین دي.",
    "orderId is required": "د فرمایش ټاکل اړین دي.",
    "At least one order allocation is required":
      "لږ تر لږه یو د فرمایش تخصیص اړین دی.",
    "Account type is required": "د حساب ډول اړین دی.",
    "Invalid account type": "د حساب ډول سم نه دی.",
    "User is required": "د کارونکي ټاکل اړین دي.",
    "Transaction date is required": "د پور نېټه اړینه ده.",
    "Amount must be a positive number": "مبلغ باید له صفر څخه زیات وي.",
    "Ton items count must match Ton Quantity":
      "د تانونو شمېر باید له ټاکل شوي مقدار سره برابر وي.",
    "Number of ton items must match tonQuantity":
      "د تانونو شمېر باید له ټاکل شوي مقدار سره برابر وي.",
    "Given money cannot exceed total price":
      "ورکړې پیسې له ټول قیمت څخه زیاتې نه شي کېدای.",
  },
};

const FIELD_LABELS = {
  dari: {
    firstName: "نام مشتری",
    "customerInfo.firstName": "نام مشتری",
    phoneNumber: "شماره تماس",
    "customerInfo.phoneNumber": "شماره تماس",
    accountType: "نوع حساب",
    userId: "کاربر",
    user: "کاربر",
    amount: "مبلغ",
    transactionDate: "تاریخ قرض",
    taskDate: "تاریخ و وقت",
    fromName: "نام فرستنده",
    recipientName: "نام گیرنده",
    orderId: "سفارش",
    orders: "سفارش",
    "allocations.0.orderId": "سفارش",
    roleType: "نقش کارگر",
    query: "عبارت جستجو",
    reason: "دلیل",
    password: "رمز عبور",
    name: "نام",
    fatherName: "نام پدر",
    percentage: "فیصدی",
    companyName: "نام شرکت",
    brandName: "نام برند",
    tonQuantity: "تعداد تان",
    tons: "تان ها",
    totalMeters: "متر مجموعی",
    totalPrice: "قیمت مجموعی",
    givenMoney: "مبلغ پرداخت شده",
    entryMonth: "ماه",
    entryYear: "سال",
    discount: "تخفیف",
    paidAmount: "مبلغ پرداخت شده",
    quantity: "تعداد",
  },
  pashto: {
    firstName: "د مشتری نوم",
    "customerInfo.firstName": "د مشتری نوم",
    phoneNumber: "د تلیفون شمېره",
    "customerInfo.phoneNumber": "د تلیفون شمېره",
    accountType: "د حساب ډول",
    userId: "کارونکی",
    user: "کارونکی",
    amount: "مبلغ",
    transactionDate: "د پور نېټه",
    taskDate: "نېټه او وخت",
    fromName: "د لېږونکي نوم",
    recipientName: "د ترلاسه کوونکي نوم",
    orderId: "فرمایش",
    orders: "فرمایش",
    "allocations.0.orderId": "فرمایش",
    roleType: "د کارګر رول",
    query: "د لټون عبارت",
    reason: "دلیل",
    password: "رمز",
    name: "نوم",
    fatherName: "د پلار نوم",
    percentage: "فیصدي",
    companyName: "د شرکت نوم",
    brandName: "د برند نوم",
    tonQuantity: "د تان شمېر",
    tons: "تانونه",
    totalMeters: "ټول مترونه",
    totalPrice: "ټول قیمت",
    givenMoney: "ورکړې پیسې",
    entryMonth: "میاشت",
    entryYear: "کال",
    discount: "تخفیف",
    paidAmount: "ورکړې پیسې",
    quantity: "تعداد",
  },
};

function normalizeLanguage(language) {
  const value = String(language || "").toLowerCase();
  if (value.startsWith("dari") || value.startsWith("fa")) return "dari";
  if (value.startsWith("pashto") || value.startsWith("ps")) return "pashto";
  return "en";
}

function normalizePath(path) {
  if (Array.isArray(path)) return path.join(".");
  return String(path || "");
}

function fieldLabel(path, language) {
  const lang = normalizeLanguage(language);
  const rawPath = normalizePath(path);
  if (!rawPath || lang === "en") return "";

  const labels = FIELD_LABELS[lang] || {};
  if (labels[rawPath]) return labels[rawPath];

  const withoutIndexes = rawPath.replace(/\.\d+(?=\.|$)/g, "");
  if (labels[withoutIndexes]) return labels[withoutIndexes];

  const parts = withoutIndexes.split(".");
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    if (labels[parts[index]]) return labels[parts[index]];
  }
  return "";
}

function requiredForField(label, language) {
  const lang = normalizeLanguage(language);
  if (!label || lang === "en") return "";
  return lang === "dari" ? `${label} ضروری است.` : `${label} اړین دی.`;
}

function invalidForField(label, language) {
  const lang = normalizeLanguage(language);
  if (!label || lang === "en") return "";
  return lang === "dari"
    ? `${label} درست وارد نشده است.`
    : `${label} سم نه دی داخل شوی.`;
}

function positiveForField(label, language) {
  const lang = normalizeLanguage(language);
  if (!label || lang === "en") return "";
  return lang === "dari"
    ? `${label} باید بیشتر از صفر باشد.`
    : `${label} باید له صفر څخه زیات وي.`;
}

export function localizeApiValidationDetail(detail, language) {
  const message = detail?.message || "";
  const label = fieldLabel(detail?.path, language);
  const raw = String(message || "").trim();

  if (/required|too_small/i.test(raw)) {
    const required = requiredForField(label, language);
    if (required) return required;
  }

  if (/positive|greater than 0|greater than zero/i.test(raw)) {
    const positive = positiveForField(label, language);
    if (positive) return positive;
  }

  if (/invalid|expected|received|number|nan/i.test(raw)) {
    const invalid = invalidForField(label, language);
    if (invalid) return invalid;
  }

  return localizeValidationMessage(message, language);
}

export function localizeValidationMessage(message, language) {
  const raw = String(message || "").trim();
  if (!raw) return raw;

  const lang = normalizeLanguage(language);

  if (
    /network error|failed to fetch|connection refused|err_network|load failed/i.test(
      raw,
    )
  ) {
    if (lang === "dari") {
      return "ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کرده و دوباره کوشش کنید.";
    }
    if (lang === "pashto") {
      return "له سرور سره اړیکه ونه نیول شوه. د انټرنېټ اړیکه وګورئ او بیا هڅه وکړئ.";
    }
    return "The server could not be reached. Check your connection and try again.";
  }

  if (/timeout|timed out|etimedout|econnaborted/i.test(raw)) {
    if (lang === "dari") {
      return "درخواست بیش از حد طول کشید. لطفاً دوباره کوشش کنید.";
    }
    if (lang === "pashto") {
      return "غوښتنې ډېر وخت ونیو. مهرباني وکړئ بیا هڅه وکړئ.";
    }
    return "The request took too long. Please try again.";
  }

  if (/^request failed with status code \d+$/i.test(raw)) {
    if (lang === "dari") {
      return "درخواست انجام نشد. لطفاً دوباره کوشش کنید.";
    }
    if (lang === "pashto") {
      return "غوښتنه بشپړه نه شوه. مهرباني وکړئ بیا هڅه وکړئ.";
    }
    return "The request could not be completed. Please try again.";
  }

  if (lang === "en") return raw;

  const bundle = VALIDATION_TRANSLATIONS[lang] || {};
  if (bundle[raw]) return bundle[raw];

  if (/^Expected .+, received .+$/i.test(raw)) {
    return lang === "dari"
      ? "مقدار واردشده برای این فیلد درست نیست."
      : "د دې فیلډ داخل شوی مقدار سم نه دی.";
  }

  if (/required/i.test(raw)) {
    return lang === "dari"
      ? "تکمیل این فیلد ضروری است."
      : "د دې فیلډ ډکول اړین دي.";
  }

  if (/invalid/i.test(raw)) {
    return lang === "dari"
      ? "مقدار واردشده درست نیست."
      : "داخل شوی مقدار سم نه دی.";
  }

  if (/must be a number|nan/i.test(raw)) {
    return lang === "dari"
      ? "لطفاً یک عدد معتبر وارد کنید."
      : "مهرباني وکړئ سم عدد ولیکئ.";
  }

  if (/too long|characters or less|less than or equal/i.test(raw)) {
    return lang === "dari"
      ? "مقدار واردشده بیش از حد طولانی است."
      : "داخل شوی مقدار ډېر اوږد دی.";
  }

  return raw;
}
