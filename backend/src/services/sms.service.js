// ─── SMS Service ─────────────────────────────────────────────────────────────
// Sends customer order-completion notifications via Twilio REST API.
// Set SMS_ENABLED=true in .env to activate real sending.
// When disabled, messages are logged to console (safe for development).

const PHONE_REGEX = /^[0-9+\s\-().]{7,20}$/;

/**
 * Normalize a phone number to E.164 format (+XXXXXXXXXXX).
 * Strips whitespace/dashes/parens, prepends + if missing.
 */
function normalizePhone(raw) {
  if (!raw) return null;
  const stripped = String(raw).replace(/[\s\-().]/g, "");
  if (!stripped) return null;
  // Reject obviously invalid strings
  if (!/^[+0-9]{7,20}$/.test(stripped)) return null;
  return stripped.startsWith("+") ? stripped : `+${stripped}`;
}

/**
 * Build the customer-facing completion SMS message.
 * All fields fall back gracefully when data is absent.
 */
function buildCompletionMessage({ shopName, customer, order }) {
  const name = customer?.firstName || "Customer";
  const bill = customer?.billNumber ? `#${customer.billNumber}` : "";
  const type = order?.type || "Order";

  // Rakht details — only include if available
  const rakhtParts = [];
  if (order?.rakhtBrandName) rakhtParts.push(order.rakhtBrandName);
  if (order?.rakhtColor) rakhtParts.push(order.rakhtColor);
  if (order?.rakhtRequiredMeters)
    rakhtParts.push(`${order.rakhtRequiredMeters}m`);
  const rakhtLine =
    rakhtParts.length > 0 ? `Fabric: ${rakhtParts.join(" | ")}` : "";

  // Pickup date = tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const pickupDate = tomorrow.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const lines = [
    `${shopName}`,
    `Dear ${name},`,
    `Your order ${bill ? `(Bill ${bill}) ` : ""}has been completed successfully.`,
    `Type: ${type}`,
  ];
  if (rakhtLine) lines.push(rakhtLine);
  lines.push(`Ready for pickup: ${pickupDate}`);
  lines.push(`Thank you for choosing ${shopName}.`);

  return lines.join("\n");
}

/**
 * Low-level send via Twilio REST API (no SDK dependency).
 * Throws on HTTP error or missing config.
 */
async function sendViaTwilio(to, message) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } =
    process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    throw new Error(
      "Twilio credentials not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)",
    );
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const body = new URLSearchParams({
    To: to,
    From: TWILIO_PHONE_NUMBER,
    Body: message,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(
      `Twilio error ${result.code || response.status}: ${result.message || "Unknown error"}`,
    );
  }

  return { success: true, sid: result.sid };
}

/**
 * Send a single SMS message. Respects SMS_ENABLED env flag.
 * Logs all attempts. Non-blocking — caller should fire-and-forget with
 * a try/catch for error logging.
 *
 * @param {string} to  - Destination phone number (any format, will be normalized)
 * @param {string} message - Text message body
 * @returns {Promise<{success: boolean, sid?: string, disabled?: boolean}>}
 */
async function sendSMS(to, message) {
  const normalized = normalizePhone(to);
  if (!normalized) {
    throw new Error(`Invalid phone number: "${to}"`);
  }

  const isEnabled = process.env.SMS_ENABLED === "true";

  if (!isEnabled) {
    console.log(`[SMS] DISABLED — would send to ${normalized}:\n${message}\n`);
    return { success: true, disabled: true };
  }

  console.log(`[SMS] Sending to ${normalized}…`);
  const result = await sendViaTwilio(normalized, message);
  console.log(`[SMS] Sent successfully. SID: ${result.sid}`);
  return result;
}

/**
 * Send the customer completion notification SMS.
 * Called when a Dokht user marks their work as complete.
 *
 * @param {object} customer  - { firstName, billNumber, phoneNumber }
 * @param {object} order     - Order record (with rakht snapshot fields)
 * @returns {Promise<{success: boolean, sid?: string, disabled?: boolean}>}
 */
export async function sendCustomerCompletionSMS(customer, order) {
  const phone = customer?.phoneNumber;
  if (!phone) {
    throw new Error("Customer phone number is not available for this order");
  }

  if (!PHONE_REGEX.test(phone)) {
    throw new Error(`Customer phone number "${phone}" is not valid`);
  }

  const shopName = process.env.SHOP_NAME || "Hoshmand Safi Tailoring";
  const message = buildCompletionMessage({ shopName, customer, order });

  return sendSMS(phone, message);
}

export async function sendCustomerOrderAssignedSMS(
  customer,
  order,
  workerName,
) {
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
