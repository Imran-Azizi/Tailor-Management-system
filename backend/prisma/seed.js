import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getNextSequentialBillNumber } from "../src/lib/billNumber.js";
const prisma = new PrismaClient();
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || "default-tenant";

async function main() {
  console.log("🌱 Seeding database...");

  const defaultTenant = await prisma.tenant.upsert({
    where: { id: DEFAULT_TENANT_ID },
    update: {
      businessName: process.env.DEFAULT_BUSINESS_NAME || "Default Tailor Shop",
      systemName: process.env.DEFAULT_SYSTEM_NAME || "Tailoring Management System",
      subscriptionStatus: "ACTIVE",
      isActive: true,
    },
    create: {
      id: DEFAULT_TENANT_ID,
      tenantId: DEFAULT_TENANT_ID,
      slug: "default",
      businessName: process.env.DEFAULT_BUSINESS_NAME || "Default Tailor Shop",
      systemName: process.env.DEFAULT_SYSTEM_NAME || "Tailoring Management System",
      subscriptionPlan: "TRIAL",
      subscriptionStatus: "ACTIVE",
      isActive: true,
    },
  });

  console.log("Default tenant ready:", defaultTenant.systemName);

  // Seed design options
  const yakhanStyles = [
    "V-Neck",
    "Round Neck",
    "Mandarin",
    "Classic",
    "Button-up",
  ];
  const astinStyles = ["Short", "Long", "Rolled", "3/4 Sleeve", "Sleeveless"];
  const damanStyles = [
    "Straight",
    "Curved",
    "Asymmetric",
    "High-Low",
    "Classic",
  ];
  const jibRows = ["Single Row", "Double Row", "Hidden"];
  const jibBaghles = ["Standard", "Decorative", "Minimal"];
  const jibTenbans = ["Side", "Front", "Back"];
  const patyShips = ["Plain", "Embroidered", "Piped"];
  const buttonShips = ["Plastic", "Metal", "Pearl", "Wood"];
  const tenbanShips = ["Elastic", "Drawstring", "Button"];

  const upsertByName = (model, name) =>
    model.upsert({
      where: { name },
      update: {},
      create: { name },
    });

  // Seed sequentially to avoid exhausting limited DB pool connections in hosted environments.
  const seedNames = async (model, names) => {
    for (const name of names) {
      await upsertByName(model, name);
    }
  };

  await seedNames(prisma.yakhan, yakhanStyles);
  await seedNames(prisma.astin, astinStyles);
  await seedNames(prisma.daman, damanStyles);
  await seedNames(prisma.jibRow, jibRows);
  await seedNames(prisma.jibBaghle, jibBaghles);
  await seedNames(prisma.jibTenban, jibTenbans);
  await seedNames(prisma.patyShip, patyShips);
  await seedNames(prisma.buttonShip, buttonShips);
  await seedNames(prisma.tenbanShip, tenbanShips);

  console.log("✅ Design styles seeded");

  // Seed a sample customer
  const nextBillNumber = await getNextSequentialBillNumber(prisma);
  const customer = await prisma.customer.upsert({
    where: {
      tenantId_phoneNumber: {
        tenantId: defaultTenant.id,
        phoneNumber: "0700000001",
      },
    },
    update: { tenantId: defaultTenant.id },
    create: {
      tenantId: defaultTenant.id,
      firstName: "Ahmad",
      phoneNumber: "0700000001",
      billNumber: nextBillNumber,
    },
  });

  console.log("✅ Sample customer created:", customer.firstName);

  // Seed default admin user (password: admin123)
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { phoneNumber: "0789577024" },
    update: { tenantId: defaultTenant.id },
    create: {
      tenantId: defaultTenant.id,
      name: "Admin",
      phoneNumber: "0789577024",
      accountType: "ADMIN",
      password: adminPassword,
    },
  });
  console.log(
    "✅ Default admin created:",
    admin.name,
    "/ phone: 0789577024 / password: admin123",
  );

  const superAdminPhone = process.env.SUPER_ADMIN_PHONE || "0700000000";
  const superAdminPassword = await bcrypt.hash(
    process.env.SUPER_ADMIN_PASSWORD || "superadmin123",
    12,
  );
  const superAdmin = await prisma.user.upsert({
    where: { phoneNumber: superAdminPhone },
    update: { accountType: "SUPER_ADMIN", tenantId: null },
    create: {
      tenantId: null,
      name: process.env.SUPER_ADMIN_NAME || "Super Admin",
      phoneNumber: superAdminPhone,
      accountType: "SUPER_ADMIN",
      password: superAdminPassword,
    },
  });
  console.log(
    "Super admin ready:",
    superAdmin.name,
    `/ phone: ${superAdmin.phoneNumber} / password: ${
      process.env.SUPER_ADMIN_PASSWORD ? "[env]" : "superadmin123"
    }`,
  );

  console.log("🎉 Seed complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
