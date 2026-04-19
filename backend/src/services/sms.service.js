const SMS_CONFIG = {
  shopName: process.env.SHOP_NAME || "Hoshmand Safi Systems",
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },
  enabled: process.env.SMS_ENABLED === "true",
};

async function sendSMS(to, message) {
  if (!SMS_CONFIG.enabled) {
    console.log(`[SMS] Disabled - Would send to ${to}: ${message}`);
    return { success: true, disabled: true };
  }

  const { accountSid, authToken, phoneNumber } = SMS_CONFIG.twilio;

  if (!accountSid || !authToken || !phoneNumber) {
    throw new Error("Twilio configuration missing");
  }

  const normalizedPhone = to.replace(/[^0-9+/]/g, "");
  const formattedPhone = normalizedPhone.startsWith("+")
    ? normalizedPhone
    : `+${normalizedPhone}`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const formData = new URLSearchParams();
  formData.append("To", formattedPhone);
  formData.append("From", phoneNumber);
  formData.append("Body", message);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to send SMS");
  }

  return { success: true, sid: result.sid };
}

export async function sendCustomerCompletionSMS(customer, order) {
  const phone = customer?.phoneNumber;
  if (!phone) {
    throw new Error("Customer phone number not available");
  }

  const shopName = process.env.SHOP_NAME || "Hoshmand Safi Systems";
  const customerName = customer?.firstName;
  const orderType = order?.type || "Order";
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const pickupDate = tomorrow.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const message = `${shopName}\nHello dear ${customerName}\nYour ${orderType} completed successfully.\nCome to the shop on ${pickupDate}.`;

  try {
    return await sendSMS(phone, message);
  } catch (error) {
    console.error("SMS delivery failed:", error);
    throw error;
  }
}

export async function sendCustomerOrderAssignedSMS(customer, order, workerName) {
  const phone = customer?.phoneNumber;
  if (!phone) {
    throw new Error("Customer phone number not available");
  }

  const message = `Hoshmand Safi Systems: Your order (Bill #${customer.billNumber}) has been assigned to ${workerName}. We will notify you when ready for pickup.`;

  try {
    return await sendSMS(phone, message);
  } catch (error) {
    console.error("SMS delivery failed:", error);
    throw error;
  }
}

export async function sendCustomerReadyForDeliverySMS(customer, order) {
  const phone = customer?.phoneNumber;
  if (!phone) {
    throw new Error("Customer phone number not available");
  }

  const message = `Hoshmand Safi Systems: Your order (Bill #${customer.billNumber}) is ready! Please visit us to collect your items.`;

  try {
    return await sendSMS(phone, message);
  } catch (error) {
    console.error("SMS delivery failed:", error);
    throw error;
  }
}

export { sendSMS };