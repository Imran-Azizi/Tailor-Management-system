import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Seed design options
  const yakhanStyles = ['V-Neck', 'Round Neck', 'Mandarin', 'Classic', 'Button-up'];
  const astinStyles  = ['Short', 'Long', 'Rolled', '3/4 Sleeve', 'Sleeveless'];
  const damanStyles  = ['Straight', 'Curved', 'Asymmetric', 'High-Low', 'Classic'];
  const jibRows      = ['Single Row', 'Double Row', 'Hidden'];
  const jibBaghles   = ['Standard', 'Decorative', 'Minimal'];
  const jibTenbans   = ['Side', 'Front', 'Back'];
  const patyShips    = ['Plain', 'Embroidered', 'Piped'];
  const buttonShips  = ['Plastic', 'Metal', 'Pearl', 'Wood'];
  const tenbanShips  = ['Elastic', 'Drawstring', 'Button'];

  const upsertByName = (model, name) =>
    model.upsert({
      where: { name },
      update: {},
      create: { name },
    });

  await Promise.all([
    ...yakhanStyles.map(name => upsertByName(prisma.yakhan, name)),
    ...astinStyles.map(name => upsertByName(prisma.astin, name)),
    ...damanStyles.map(name => upsertByName(prisma.daman, name)),
    ...jibRows.map(name => upsertByName(prisma.jibRow, name)),
    ...jibBaghles.map(name => upsertByName(prisma.jibBaghle, name)),
    ...jibTenbans.map(name => upsertByName(prisma.jibTenban, name)),
    ...patyShips.map(name => upsertByName(prisma.patyShip, name)),
    ...buttonShips.map(name => upsertByName(prisma.buttonShip, name)),
    ...tenbanShips.map(name => upsertByName(prisma.tenbanShip, name)),
  ]);

  console.log('✅ Design styles seeded');

  // Seed a sample customer
  const customer = await prisma.customer.upsert({
    where: { phoneNumber: '0700000001' },
    update: {},
    create: { firstName: 'Ahmad', phoneNumber: '0700000001', billNumber: 100 },
  });

  console.log('✅ Sample customer created:', customer.firstName);

  // Seed default admin user (password: admin123)
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { phoneNumber: '0700000000' },
    update: {},
    create: {
      name: 'Admin',
      phoneNumber: '0700000000',
      accountType: 'ADMIN',
      password: adminPassword,
    },
  });
  console.log('✅ Default admin created:', admin.name, '/ phone: 0700000000 / password: admin123');

  console.log('🎉 Seed complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
