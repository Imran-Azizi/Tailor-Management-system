import { SHOP_CONFIG } from "./shopConfig.js";

export const SUPPORT_TEAM_CONFIG = {
  companyName: {
    en: "Hoshmand Safi",
    dari: "هوشمند صافی",
    pashto: "هوشمند صافي",
  },
  address: SHOP_CONFIG.address,
  phones: SHOP_CONFIG.phones || [],
  email: "hoshmandsafi500@gmail.com",
  website: "https://hoshmandsafi.com",
  businessHours: {
    en: "Saturday - Thursday, 8:00 AM - 6:00 PM",
    dari: "شنبه تا پنج‌شنبه، ۸:۰۰ صبح تا ۶:۰۰ عصر",
    pashto: "شنبه تر پنجشنبې، سهار ۸:۰۰ تر ماښام ۶:۰۰",
  },
  socialLinks: [
    {
      key: "whatsapp",
      labelKey: "supportTeam.whatsapp",
      href: "https://wa.me/93780223344",
    },
    {
      key: "facebook",
      labelKey: "supportTeam.facebook",
      href: "https://www.facebook.com/share/1DxnRwLhjy/?mibextid=wwXIfr",
    },
    {
      key: "instagram",
      labelKey: "supportTeam.instagram",
      href: "https://instagram.com/hoshmandsafi",
    },
  ],
};
