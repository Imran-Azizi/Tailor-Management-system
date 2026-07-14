const SHARED_API_MESSAGES = {
  // Auth / session
  "Validation error": {
    dari: "لطفاً معلومات واردشده را بررسی کنید.",
    pashto: "مهرباني وکړئ داخل شوي معلومات وګورئ.",
  },
  "A record with this value already exists.": {
    dari: "این معلومات قبلاً ثبت شده است.",
    pashto: "دا معلومات مخکې ثبت شوي دي.",
  },
  "Record not found.": {
    dari: "رکورد مورد نظر یافت نشد.",
    pashto: "غوښتل شوی ریکارډ ونه موندل شو.",
  },
  "Database unavailable. Please try again shortly.": {
    dari: "دیتابیس فعلاً در دسترس نیست. لطفاً کمی بعد دوباره کوشش کنید.",
    pashto: "ډیټابیس اوس لاسرسی نه لري. مهرباني وکړئ لږ وروسته بیا هڅه وکړئ.",
  },
  "Internal server error": {
    dari: "مشکل تخنیکی رخ داد. لطفاً دوباره کوشش کنید.",
    pashto: "تخنیکي ستونزه رامنځته شوه. مهرباني وکړئ بیا هڅه وکړئ.",
  },
  "Request failed": {
    dari: "درخواست انجام نشد. لطفاً دوباره کوشش کنید.",
    pashto: "غوښتنه بشپړه نه شوه. مهرباني وکړئ بیا هڅه وکړئ.",
  },
  "Phone number and password are required.": {
    dari: "شماره تماس و رمز عبور ضروری است.",
    pashto: "د تلیفون شمېره او رمز اړین دي.",
  },
  "Invalid credentials.": {
    dari: "شماره تماس یا رمز عبور درست نیست.",
    pashto: "د تلیفون شمېره یا رمز ناسم دی.",
  },
  "Account is deactivated. Contact admin.": {
    dari: "این حساب غیرفعال است. لطفاً با مدیر سیستم تماس بگیرید.",
    pashto: "دا حساب غیر فعال دی. مهرباني وکړئ له مدیر سره اړیکه ونیسئ.",
  },
  "Authentication required.": {
    dari: "برای ادامه باید وارد سیستم شوید.",
    pashto: "د دوام لپاره سیستم ته ننوتل اړین دي.",
  },
  "Invalid or expired token.": {
    dari: "نشست شما منقضی شده است. لطفاً دوباره وارد شوید.",
    pashto: "ستاسې ناسته پای ته رسېدلې ده. مهرباني وکړئ بیا ننوځئ.",
  },
  "Session expired. Please sign in again.": {
    dari: "نشست شما منقضی شده است. لطفاً دوباره وارد شوید.",
    pashto: "ستاسې ناسته پای ته رسېدلې ده. مهرباني وکړئ بیا ننوځئ.",
  },
  "You do not have permission to perform this action.": {
    dari: "شما اجازه انجام این عمل را ندارید.",
    pashto: "تاسې د دې عمل اجازه نه لرئ.",
  },
  "You do not have permission to access this order.": {
    dari: "شما اجازه دسترسی به این سفارش را ندارید.",
    pashto: "تاسې د دې فرمایش د لاسرسي اجازه نه لرئ.",
  },
  "Tenant account is suspended.": {
    dari: "این سیستم تعلیق شده است.",
    pashto: "دا سیستم ځنډول شوی دی.",
  },
  "Subscription expired.": {
    dari: "اشتراک این سیستم منقضی شده است.",
    pashto: "د دې سیستم ګډون پای ته رسېدلی دی.",
  },
  "Your secure session check expired. Please try again.": {
    dari: "بررسی امنیتی نشست منقضی شد. لطفاً دوباره کوشش کنید.",
    pashto: "د خوندي ناستې تایید پای ته ورسېد. مهرباني وکړئ بیا هڅه وکړئ.",
  },
  "Please select your tenant before signing in.": {
    dari: "لطفاً قبل از ورود، سیستم خود را انتخاب کنید.",
    pashto: "مهرباني وکړئ د ننوتلو مخکې خپل سیستم وټاکئ.",
  },
  "Refresh token required.": {
    dari: "توکن تازه‌سازی ضروری است.",
    pashto: "د تازه کولو توکن اړین دی.",
  },
  "Invalid or expired refresh token.": {
    dari: "توکن تازه‌سازی نامعتبر یا منقضی است.",
    pashto: "د تازه کولو توکن ناسم یا پای ته رسېدلی دی.",
  },
  "Token revoked or invalid.": {
    dari: "توکن باطل یا نامعتبر است.",
    pashto: "توکن باطل یا ناسم دی.",
  },
  "Account not found or deactivated.": {
    dari: "حساب یافت نشد یا غیرفعال است.",
    pashto: "حساب ونه موندل شو یا غیر فعال دی.",
  },
  "Session tenant mismatch.": {
    dari: "نشست با سیستم مطابقت ندارد.",
    pashto: "ناسته له سیستم سره سمون نه لري.",
  },
  "Tenant account is not configured.": {
    dari: "حساب سیستم تنظیم نشده است.",
    pashto: "د سیستم حساب نه دی تنظیم شوی.",
  },
  "Tenant context is required.": {
    dari: "اطلاعات سیستم ضروری است.",
    pashto: "د سیستم معلومات اړین دي.",
  },

  // Form validation
  "First name is required": {
    dari: "نام مشتری ضروری است.",
    pashto: "د مشتری نوم اړین دی.",
  },
  "Phone number must be at least 7 digits": {
    dari: "شماره تماس باید حداقل ۷ رقم باشد.",
    pashto: "د تلیفون شمېره باید لږ تر لږه ۷ رقمونه وي.",
  },
  "At least one order item required": {
    dari: "حداقل یک مورد سفارش ضروری است.",
    pashto: "لږ تر لږه یو د فرمایش توکی اړین دی.",
  },
  "clientKey is required": {
    dari: "کلید پیش نویس ضروری است.",
    pashto: "د مسودې کلید اړین دی.",
  },
  "Worker role is required": {
    dari: "نقش کارگر ضروری است.",
    pashto: "د کارګر رول اړین دی.",
  },
  "Invalid worker role": {
    dari: "نقش کارگر درست نیست.",
    pashto: "د کارګر رول سم نه دی.",
  },
  "Invalid worker role.": {
    dari: "نقش کارگر درست نیست.",
    pashto: "د کارګر رول سم نه دی.",
  },
  "Search query is required": {
    dari: "عبارت جستجو ضروری است.",
    pashto: "د لټون عبارت اړین دی.",
  },
  "Worker is required": {
    dari: "انتخاب کارگر ضروری است.",
    pashto: "د کارګر ټاکل اړین دي.",
  },
  "Order is required": {
    dari: "انتخاب سفارش ضروری است.",
    pashto: "د فرمایش ټاکل اړین دي.",
  },
  "Reason is required": {
    dari: "دلیل ضروری است.",
    pashto: "دلیل اړین دی.",
  },
  "Reason must be 300 characters or less": {
    dari: "دلیل باید ۳۰۰ حرف یا کمتر باشد.",
    pashto: "دلیل باید ۳۰۰ توري یا تر دې کم وي.",
  },
  "Percentage is required": {
    dari: "فیصدی ضروری است.",
    pashto: "فیصدي اړینه ده.",
  },
  "Percentage must be a number": {
    dari: "فیصدی باید عدد باشد.",
    pashto: "فیصدي باید عدد وي.",
  },
  "Percentage cannot be negative": {
    dari: "فیصدی نمی تواند منفی باشد.",
    pashto: "فیصدي منفي نه شي کېدای.",
  },
  "Percentage cannot be greater than 100": {
    dari: "فیصدی نمی تواند بیشتر از ۱۰۰ باشد.",
    pashto: "فیصدي له ۱۰۰ څخه زیاته نه شي کېدای.",
  },
  "Password is required": {
    dari: "رمز عبور ضروری است.",
    pashto: "رمز اړین دی.",
  },
  "Password must be at least 6 characters": {
    dari: "رمز عبور باید حداقل ۶ حرف باشد.",
    pashto: "رمز باید لږ تر لږه ۶ توري وي.",
  },
  "Password must be at least 6 characters.": {
    dari: "رمز عبور باید حداقل ۶ حرف باشد.",
    pashto: "رمز باید لږ تر لږه ۶ توري وي.",
  },
  "Password is too long": {
    dari: "رمز عبور بیش از حد طولانی است.",
    pashto: "رمز ډېر اوږد دی.",
  },
  "Password is required for new users.": {
    dari: "برای کاربران جدید رمز عبور ضروری است.",
    pashto: "د نوي کاروونکو لپاره رمز اړین دی.",
  },
  "Contributor name is required": {
    dari: "نام شریک کار ضروری است.",
    pashto: "د شریک کار نوم اړین دی.",
  },
  "Contributor father name is required": {
    dari: "نام پدر شریک کار ضروری است.",
    pashto: "د شریک کار د پلار نوم اړین دی.",
  },
  "Sender name is required": {
    dari: "نام فرستنده ضروری است.",
    pashto: "د لېږونکي نوم اړین دی.",
  },
  "Recipient name is required": {
    dari: "نام گیرنده ضروری است.",
    pashto: "د ترلاسه کوونکي نوم اړین دی.",
  },
  "Amount is required": {
    dari: "مبلغ ضروری است.",
    pashto: "مبلغ اړین دی.",
  },
  "Amount must be a number": {
    dari: "مبلغ باید عدد باشد.",
    pashto: "مبلغ باید عدد وي.",
  },
  "Amount must be a valid number": {
    dari: "مبلغ باید یک عدد معتبر باشد.",
    pashto: "مبلغ باید سم عدد وي.",
  },
  "Amount must be greater than 0": {
    dari: "مبلغ باید بیشتر از صفر باشد.",
    pashto: "مبلغ باید له صفر څخه زیات وي.",
  },
  "Amount must be a positive number": {
    dari: "مبلغ باید بیشتر از صفر باشد.",
    pashto: "مبلغ باید له صفر څخه زیات وي.",
  },
  "Date & time is required": {
    dari: "تاریخ و وقت ضروری است.",
    pashto: "نېټه او وخت اړین دي.",
  },
  "orderId is required": {
    dari: "انتخاب سفارش ضروری است.",
    pashto: "د فرمایش ټاکل اړین دي.",
  },
  "Order id is required.": {
    dari: "شناسه سفارش ضروری است.",
    pashto: "د فرمایش پېژندنه اړینه ده.",
  },
  "At least one order allocation is required": {
    dari: "حداقل یک تخصیص سفارش ضروری است.",
    pashto: "لږ تر لږه یو د فرمایش تخصیص اړین دی.",
  },
  "Account type is required": {
    dari: "نوع حساب ضروری است.",
    pashto: "د حساب ډول اړین دی.",
  },
  "Invalid account type": {
    dari: "نوع حساب درست نیست.",
    pashto: "د حساب ډول سم نه دی.",
  },
  "Invalid accountType.": {
    dari: "نوع حساب درست نیست.",
    pashto: "د حساب ډول سم نه دی.",
  },
  "User is required": {
    dari: "انتخاب کاربر ضروری است.",
    pashto: "د کارونکي ټاکل اړین دي.",
  },
  "User not found.": {
    dari: "کاربر یافت نشد.",
    pashto: "کارونکی ونه موندل شو.",
  },
  "name, phoneNumber and accountType are required.": {
    dari: "نام، شماره تماس و نوع حساب ضروری است.",
    pashto: "نوم، د تلیفون شمېره او د حساب ډول اړین دي.",
  },
  "Transaction date is required": {
    dari: "تاریخ قرض ضروری است.",
    pashto: "د پور نېټه اړینه ده.",
  },
  "Ton items count must match Ton Quantity": {
    dari: "تعداد تان ها باید با مقدار انتخاب شده برابر باشد.",
    pashto: "د تانونو شمېر باید له ټاکل شوي مقدار سره برابر وي.",
  },
  "Number of ton items must match tonQuantity": {
    dari: "تعداد تان ها باید با مقدار انتخاب شده برابر باشد.",
    pashto: "د تانونو شمېر باید له ټاکل شوي مقدار سره برابر وي.",
  },
  "Given money cannot exceed total price": {
    dari: "مبلغ پرداخت شده نمی تواند بیشتر از قیمت مجموعی باشد.",
    pashto: "ورکړې پیسې له ټول قیمت څخه زیاتې نه شي کېدای.",
  },
  "You cannot delete your own account.": {
    dari: "نمی توانید حساب خود را حذف کنید.",
    pashto: "تاسې خپل حساب نشي حذفولی.",
  },
  "Current password is required.": {
    dari: "رمز عبور فعلی ضروری است.",
    pashto: "اوسنی رمز اړین دی.",
  },
  "Current password is incorrect.": {
    dari: "رمز عبور فعلی نادرست است.",
    pashto: "اوسنی رمز ناسم دی.",
  },
  "This phone number is already in use.": {
    dari: "این شماره تماس قبلاً استفاده شده است.",
    pashto: "دا د تلیفون شمېره مخکې کارول شوې ده.",
  },
  "All password fields are required.": {
    dari: "پر کردن تمام فیلدهای رمز عبور ضروری است.",
    pashto: "د رمز ټول فیلډونه اړین دي.",
  },
  "New password and confirmation do not match.": {
    dari: "رمز عبور جدید و تأیید آن یکسان نیست.",
    pashto: "نوی رمز او تایید یې سره سمون نه لري.",
  },
  "New password must be different from the current password.": {
    dari: "رمز عبور جدید باید با رمز فعلی متفاوت باشد.",
    pashto: "نوی رمز باید له اوسني رمز څخه توپیر ولري.",
  },
  "Enter a valid phone number.": {
    dari: "شماره تماس معتبر وارد کنید.",
    pashto: "سمه د تلیفون شمېره ولیکئ.",
  },
  "Full name must be between 2 and 100 characters.": {
    dari: "نام کامل باید بین ۲ تا ۱۰۰ حرف باشد.",
    pashto: "بشپړ نوم باید د ۲ او ۱۰۰ تورو ترمنځ وي.",
  },
  "Super admin account not found.": {
    dari: "حساب سوپرادمین یافت نشد.",
    pashto: "د سوپراډمین حساب ونه موندل شو.",
  },

  // Orders / assignment
  "Order not found.": {
    dari: "سفارش یافت نشد.",
    pashto: "فرمایش ونه موندل شو.",
  },
  "Order not found": {
    dari: "سفارش یافت نشد.",
    pashto: "فرمایش ونه موندل شو.",
  },
  "No matching record found": {
    dari: "هیچ رکورد مطابقی یافت نشد.",
    pashto: "هیڅ سمون لرونکی ریکارډ ونه موندل شو.",
  },
  "No eligible order found for this bill number.": {
    dari: "برای این شماره بل سفارش قابل استفاده‌ای یافت نشد.",
    pashto: "د دې بل شمېرې لپاره مناسب فرمایش ونه موندل شو.",
  },
  "this order already receive by someone else try another": {
    dari: "این سفارش قبلاً توسط شخص دیگری دریافت شده است؛ لطفاً سفارش دیگری را امتحان کنید.",
    pashto: "دا فرمایش مخکې بل چا ترلاسه کړی دی؛ مهرباني وکړئ بل فرمایش وازموئ.",
  },
  "This order completed, you can not assign it again": {
    dari: "این سفارش تکمیل شده است؛ دوباره سپردن آن مجاز نیست.",
    pashto: "دا فرمایش بشپړ شوی دی؛ بیا سپارل یې اجازه نه لري.",
  },
  "This order is already assigned to a Qichikar worker and cannot be assigned again.":
    {
      dari: "این سفارش قبلاً به یک کارمند قیچی‌کار سپرده شده و دوباره قابل سپردن نیست.",
      pashto: "دا فرمایش مخکې یو قیچي‌کار ته سپارل شوی او بیا نشي سپارل کېدای.",
    },
  "This order is already assigned to a Dokht worker and cannot be assigned again.":
    {
      dari: "این سفارش قبلاً به یک کارمند دوخت سپرده شده و دوباره قابل سپردن نیست.",
      pashto: "دا فرمایش مخکې یو دخت کارکوونکي ته سپارل شوی او بیا نشي سپارل کېدای.",
    },
  "Orders can only be assigned to Qichikar or Dokht.": {
    dari: "سفارش فقط به قیچی‌کار یا دوخت قابل سپردن است.",
    pashto: "فرمایش یوازې قیچي‌کار یا دخت ته سپارل کېدای شي.",
  },
  "Completed orders cannot be received.": {
    dari: "سفارش‌های تکمیل‌شده قابل دریافت نیستند.",
    pashto: "بشپړ شوي فرمایشونه نشي ترلاسه کېدای.",
  },
  "Completed orders cannot be declined.": {
    dari: "سفارش‌های تکمیل‌شده قابل رد نیستند.",
    pashto: "بشپړ شوي فرمایشونه نشي ردېدای.",
  },
  "You can only decline orders assigned to you.": {
    dari: "فقط سفارش‌های سپرده‌شده به خودتان را می‌توانید رد کنید.",
    pashto: "تاسې یوازې هغه فرمایشونه ردولی شئ چې تاسو ته سپارل شوي وي.",
  },
  "Cannot decline an order that was already accepted.": {
    dari: "سفارشی که قبلاً قبول شده قابل رد نیست.",
    pashto: "هغه فرمایش چې مخکې قبول شوی وي نشي ردېدای.",
  },
  "Receive this order before starting work.": {
    dari: "قبل از شروع کار، ابتدا سفارش را دریافت کنید.",
    pashto: "د کار پیل مخکې دا فرمایش ترلاسه کړئ.",
  },
  "You can only complete orders assigned to you.": {
    dari: "فقط سفارش‌های سپرده‌شده به خودتان را می‌توانید تکمیل کنید.",
    pashto: "تاسې یوازې هغه فرمایشونه بشپړولی شئ چې تاسو ته سپارل شوي وي.",
  },
  "You can only update orders assigned to you.": {
    dari: "فقط سفارش‌های سپرده‌شده به خودتان را می‌توانید به‌روزرسانی کنید.",
    pashto: "تاسې یوازې هغه فرمایشونه تازه کولی شئ چې تاسو ته سپارل شوي وي.",
  },
  "Order already completed.": {
    dari: "این سفارش قبلاً تکمیل شده است.",
    pashto: "دا فرمایش مخکې بشپړ شوی دی.",
  },
  "Qichikar work for this order is already completed.": {
    dari: "کار قیچی‌کار برای این سفارش قبلاً تکمیل شده است.",
    pashto: "د دې فرمایش قیچي کار مخکې بشپړ شوی دی.",
  },
  "Dokht work for this order is already completed.": {
    dari: "کار دوخت برای این سفارش قبلاً تکمیل شده است.",
    pashto: "د دې فرمایش دخت کار مخکې بشپړ شوی دی.",
  },
  "Order has no assigned worker.": {
    dari: "این سفارش کارمند سپرده‌شده ندارد.",
    pashto: "دا فرمایش سپارل شوی کارکوونکی نه لري.",
  },
  "Assigned user is not a worker.": {
    dari: "کاربر سپرده‌شده کارمند نیست.",
    pashto: "سپارل شوی کارونکی کارکوونکی نه دی.",
  },
  "Order completion is only allowed from Clothes Delivery Receive action.": {
    dari: "تکمیل سفارش فقط از طریق دریافت لباس تحویل‌شده مجاز است.",
    pashto: "د فرمایش بشپړول یوازې د تحویل شویو جامو د ترلاسه کولو له لارې اجازه لري.",
  },
  "Only admin or finance can mark delivery completion for customer handover.": {
    dari: "فقط ادمین یا حسابداری می‌تواند تکمیل تحویل به مشتری را ثبت کند.",
    pashto: "یوازې اډمین یا حساب ورکوونکی کولی شي د مشتری تحویل بشپړول ثبت کړي.",
  },
  "This order cannot be marked as completed until full payment is confirmed by admin.":
    {
      dari: "تا وقتی ادمین پرداخت کامل را تأیید نکند، این سفارش تکمیل‌شده ثبت نمی‌شود.",
      pashto: "تر څو اډمین بشپړه تادیه تایید نه کړي، دا فرمایش بشپړ نشي ثبتېدای.",
    },
  "Cannot update status of a completed order.": {
    dari: "وضعیت سفارش تکمیل‌شده قابل تغییر نیست.",
    pashto: "د بشپړ شوي فرمایش حالت نشي بدلولای.",
  },
  "Payment amount must be a valid positive number.": {
    dari: "مبلغ پرداخت باید یک عدد معتبر و بیشتر از صفر باشد.",
    pashto: "د تادیې مبلغ باید سم او له صفر څخه زیات عدد وي.",
  },
  "Qichikar has not completed this order yet.": {
    dari: "قیچی‌کار هنوز این سفارش را تکمیل نکرده است.",
    pashto: "قیچي‌کار لا دا فرمایش نه دی بشپړ کړی.",
  },
  "Dokht has not completed this order yet.": {
    dari: "دوخت هنوز این سفارش را تکمیل نکرده است.",
    pashto: "دخت لا دا فرمایش نه دی بشپړ کړی.",
  },
  "Valid month (1-12) and year are required": {
    dari: "ماه معتبر (۱ تا ۱۲) و سال ضروری است.",
    pashto: "سمه میاشت (۱–۱۲) او کال اړین دي.",
  },
  "Item not found.": {
    dari: "جنس یافت نشد.",
    pashto: "توکی ونه موندل شو.",
  },
  "Item is required.": {
    dari: "انتخاب جنس ضروری است.",
    pashto: "د توکي ټاکل اړین دي.",
  },
  "Customer price must be valid.": {
    dari: "قیمت مشتری باید معتبر باشد.",
    pashto: "د مشتری بیه باید سمه وي.",
  },
  "Quantity sold must be valid.": {
    dari: "تعداد فروخته‌شده باید معتبر باشد.",
    pashto: "پلورل شوې شمېره باید سمه وي.",
  },
  "Category not found.": {
    dari: "کتگوری یافت نشد.",
    pashto: "کټګوري ونه موندل شوه.",
  },
  "Customer not found": {
    dari: "مشتری یافت نشد.",
    pashto: "مشتری ونه موندل شو.",
  },
  "permissions must be an array of permission codes.": {
    dari: "مجوزها باید به‌صورت فهرست کدهای دسترسی باشد.",
    pashto: "اجازې باید د اجازې کوډونو لست وي.",
  },
  "Draft save failed": {
    dari: "ذخیره پیش‌نویس ناموفق بود.",
    pashto: "د مسودې خوندي کول ناکام شول.",
  },
};

const VALIDATION_TRANSLATIONS = {
  dari: Object.fromEntries(
    Object.entries(SHARED_API_MESSAGES).map(([key, value]) => [key, value.dari]),
  ),
  pashto: Object.fromEntries(
    Object.entries(SHARED_API_MESSAGES).map(([key, value]) => [
      key,
      value.pashto,
    ]),
  ),
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

function normalizeMessageKey(message) {
  return String(message || "")
    .trim()
    .replace(/\s+/g, " ");
}

function lookupExactTranslation(raw, language) {
  const lang = normalizeLanguage(language);
  if (lang === "en") return null;

  const bundle = VALIDATION_TRANSLATIONS[lang] || {};
  const normalized = normalizeMessageKey(raw);
  if (bundle[normalized]) return bundle[normalized];

  const withoutTrailingDot = normalized.replace(/\.+$/, "");
  if (bundle[withoutTrailingDot]) return bundle[withoutTrailingDot];
  if (bundle[`${withoutTrailingDot}.`]) return bundle[`${withoutTrailingDot}.`];

  const lower = normalized.toLowerCase();
  for (const [key, value] of Object.entries(bundle)) {
    if (key.toLowerCase() === lower) return value;
    if (key.replace(/\.+$/, "").toLowerCase() === withoutTrailingDot.toLowerCase()) {
      return value;
    }
  }

  return null;
}

function localizeDynamicPatterns(raw, language) {
  const lang = normalizeLanguage(language);
  if (lang === "en") return null;

  const alreadyAssigned = raw.match(
    /^This order is already assigned to a (Qichikar|Dokht) worker and cannot be assigned again\.?$/i,
  );
  if (alreadyAssigned) {
    const role = alreadyAssigned[1].toLowerCase();
    if (lang === "dari") {
      return role === "dokht"
        ? "این سفارش قبلاً به یک کارمند دوخت سپرده شده و دوباره قابل سپردن نیست."
        : "این سفارش قبلاً به یک کارمند قیچی‌کار سپرده شده و دوباره قابل سپردن نیست.";
    }
    return role === "dokht"
      ? "دا فرمایش مخکې یو دخت کارکوونکي ته سپارل شوی او بیا نشي سپارل کېدای."
      : "دا فرمایش مخکې یو قیچي‌کار ته سپارل شوی او بیا نشي سپارل کېدای.";
  }

  const roleNotCompleted = raw.match(
    /^(Qichikar|Dokht) has not completed this order yet\.?$/i,
  );
  if (roleNotCompleted) {
    const role = roleNotCompleted[1].toLowerCase();
    if (lang === "dari") {
      return role === "dokht"
        ? "دوخت هنوز این سفارش را تکمیل نکرده است."
        : "قیچی‌کار هنوز این سفارش را تکمیل نکرده است.";
    }
    return role === "dokht"
      ? "دخت لا دا فرمایش نه دی بشپړ کړی."
      : "قیچي‌کار لا دا فرمایش نه دی بشپړ کړی.";
  }

  const passwordMin = raw.match(
    /^Password must be at least (\d+) characters and include a letter and a number\.?$/i,
  );
  if (passwordMin) {
    const count = passwordMin[1];
    if (lang === "dari") {
      return `رمز عبور باید حداقل ${count} حرف باشد و شامل حرف و عدد باشد.`;
    }
    return `رمز باید لږ تر لږه ${count} توري ولري او حرف او عدد پکې وي.`;
  }

  return null;
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
  const raw = normalizeMessageKey(message);
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

  const exact = lookupExactTranslation(raw, language);
  if (exact) return exact;

  const patterned = localizeDynamicPatterns(raw, language);
  if (patterned) return patterned;

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
