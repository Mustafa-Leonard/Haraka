import './load-env';
import { PrismaClient } from '../generated/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Development seed data cannot be applied in production.');
  }

  const demoPassword = process.env.HARAKA_DEMO_PASSWORD;
  if (!demoPassword || demoPassword.length < 16) {
    throw new Error('Set HARAKA_DEMO_PASSWORD to a value of at least 16 characters before seeding.');
  }
  const demoPasswordHash = await argon2.hash(demoPassword, { type: argon2.argon2id });

  console.log('Seeding Haraka development database...');

  // 1. Roles & Permissions
  const adminRole = await prisma.role.upsert({
    where: { name: 'SUPER_ADMIN' },
    update: {},
    create: {
      name: 'SUPER_ADMIN',
      description: 'Full system administrator privileges',
      isSystem: true,
    },
  });

  const dispatcherRole = await prisma.role.upsert({
    where: { name: 'DISPATCHER' },
    update: {},
    create: {
      name: 'DISPATCHER',
      description: 'Operations fleet dispatcher',
      isSystem: true,
    },
  });

  const merchantRole = await prisma.role.upsert({
    where: { name: 'MERCHANT' },
    update: {},
    create: {
      name: 'MERCHANT',
      description: 'Registered business or sender',
      isSystem: true,
    },
  });

  const riderRole = await prisma.role.upsert({
    where: { name: 'RIDER' },
    update: {},
    create: {
      name: 'RIDER',
      description: 'Verified boda-boda or tuk-tuk rider',
      isSystem: true,
    },
  });

  // 2. Service Zones: Kilifi, Malindi, Mombasa
  const kilifiZone = await prisma.serviceZone.upsert({
    where: { slug: 'kilifi' },
    update: {},
    create: {
      name: 'Kilifi',
      slug: 'kilifi',
      description: 'Kilifi Town, Bofa, Sea Horse, Pwani University corridor',
      sortOrder: 1,
    },
  });

  const malindiZone = await prisma.serviceZone.upsert({
    where: { slug: 'malindi' },
    update: {},
    create: {
      name: 'Malindi',
      slug: 'malindi',
      description: 'Malindi Town, Casuarina, Mtangani, Airport',
      sortOrder: 2,
    },
  });

  const mombasaZone = await prisma.serviceZone.upsert({
    where: { slug: 'mombasa' },
    update: {},
    create: {
      name: 'Mombasa',
      slug: 'mombasa',
      description: 'Mombasa Island, Nyali, Bamburi, Changamwe, Likoni',
      sortOrder: 3,
    },
  });

  // 3. Default Pricing Rules (Boda & Tuk-Tuk)
  const bodaRule = await prisma.pricingRule.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      vehicleType: 'BODA',
      baseFare: 10000, // KES 100.00
      perKmRate: 4000, // KES 40.00 / km
      minimumFare: 10000, // KES 100.00
      version: 1,
      notes: 'Standard coastal Boda pricing',
    },
  });

  const tuktukRule = await prisma.pricingRule.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      vehicleType: 'TUKTUK',
      baseFare: 20000, // KES 200.00
      perKmRate: 6000, // KES 60.00 / km
      minimumFare: 20000, // KES 200.00
      version: 1,
      notes: 'Standard coastal Tuk-Tuk pricing',
    },
  });

  // Multipliers for parcel sizes
  for (const [size, mult] of [
    ['SMALL', 1.0],
    ['MEDIUM', 1.25],
    ['LARGE', 1.6],
    ['EXTRA_LARGE', 2.2],
  ] as const) {
    await prisma.parcelSizeMultiplier.upsert({
      where: {
        pricingRuleId_parcelSize: {
          pricingRuleId: bodaRule.id,
          parcelSize: size,
        },
      },
      update: {},
      create: {
        pricingRuleId: bodaRule.id,
        parcelSize: size,
        multiplier: mult,
      },
    });

    await prisma.parcelSizeMultiplier.upsert({
      where: {
        pricingRuleId_parcelSize: {
          pricingRuleId: tuktukRule.id,
          parcelSize: size,
        },
      },
      update: {},
      create: {
        pricingRuleId: tuktukRule.id,
        parcelSize: size,
        multiplier: mult,
      },
    });
  }

  // 4. Demo Merchant: Mama Fatuma General Store (Kilifi)
  const merchantUser = await prisma.user.upsert({
    where: { phone: '+254711000001' },
    update: { passwordHash: demoPasswordHash },
    create: {
      phone: '+254711000001',
      phoneVerified: true,
      passwordHash: demoPasswordHash,
      email: 'fatuma@kilifistore.co.ke',
      displayName: 'Mama Fatuma',
      preferredLanguage: 'sw',
      roles: ['MERCHANT'],
    },
  });

  const merchantProfile = await prisma.merchant.upsert({
    where: { userId: merchantUser.id },
    update: {},
    create: {
      userId: merchantUser.id,
      businessName: 'Mama Fatuma Spices & Sundries',
      businessType: 'Retail & Spices',
      description: 'Kilifi town center wholesale and retail grocery',
      isVerified: true,
      defaultZoneId: kilifiZone.id,
    },
  });

  // Add default pickup address for Mama Fatuma
  await prisma.address.create({
    data: {
      merchantId: merchantProfile.id,
      label: 'Main Shop',
      street: 'Biashara Street, Kilifi Town',
      building: 'Old Post Office Building, Ground Floor',
      area: 'Town Centre',
      town: 'Kilifi',
      instructions: 'Opposite Kilifi Stage near the banyan tree',
      latitude: -3.6305,
      longitude: 39.8499,
      isDefault: true,
    },
  });

  // 5. Demo Rider: Juma Kazungu (Boda Boda Rider, Approved & Online)
  const riderUser = await prisma.user.upsert({
    where: { phone: '+254722000002' },
    update: { passwordHash: demoPasswordHash },
    create: {
      phone: '+254722000002',
      phoneVerified: true,
      passwordHash: demoPasswordHash,
      displayName: 'Juma Kazungu',
      preferredLanguage: 'sw',
      roles: ['RIDER'],
    },
  });

  const riderVehicle = await prisma.vehicle.upsert({
    where: { plateNumber: 'KMDF 123X' },
    update: {},
    create: {
      type: 'BODA',
      make: 'Boxer',
      model: 'BM 150',
      year: 2023,
      plateNumber: 'KMDF 123X',
      color: 'Red/Black',
    },
  });

  const riderProfile = await prisma.rider.upsert({
    where: { userId: riderUser.id },
    update: {},
    create: {
      userId: riderUser.id,
      verificationStatus: 'APPROVED',
      onlineStatus: 'ONLINE',
      zoneId: kilifiZone.id,
      averageRating: 4.95,
      ratingCount: 142,
      totalDeliveries: 168,
    },
  });

  await prisma.riderVehicleAssignment.upsert({
    where: {
      riderId_vehicleId: {
        riderId: riderProfile.id,
        vehicleId: riderVehicle.id,
      },
    },
    update: {},
    create: {
      riderId: riderProfile.id,
      vehicleId: riderVehicle.id,
      isPrimary: true,
    },
  });

  // Initial rider location in Kilifi town
  await prisma.riderLocationState.upsert({
    where: { riderId: riderProfile.id },
    update: {
      latitude: -3.631,
      longitude: 39.8505,
      isStale: false,
      recordedAt: new Date(),
    },
    create: {
      riderId: riderProfile.id,
      latitude: -3.631,
      longitude: 39.8505,
      accuracy: 5.0,
      heading: 90.0,
      speed: 0.0,
      recordedAt: new Date(),
    },
  });

  // 6. Demo Admin: Haraka Operations Lead
  const adminUser = await prisma.user.upsert({
    where: { phone: '+254700000000' },
    update: { passwordHash: demoPasswordHash },
    create: {
      phone: '+254700000000',
      phoneVerified: true,
      passwordHash: demoPasswordHash,
      email: 'ops@haraka.co.ke',
      displayName: 'Haraka Dispatch Lead',
      roles: ['ADMIN', 'DISPATCHER'],
    },
  });

  // 7. Ledger Chart of Accounts
  for (const [code, name, type] of [
    ['PLATFORM_REVENUE', 'Haraka Delivery Commission Revenue', 'REVENUE'],
    ['MERCHANT_PAYABLE', 'Merchant Disputed or Refund Balances', 'LIABILITY'],
    ['RIDER_PAYABLE', 'Rider Earned Balances Pending Payout', 'LIABILITY'],
    ['CASH_IN_TRANSIT_RIDER', 'COD Collected by Rider Held in Trust', 'ASSET'],
    ['MPESA_CLEARING', 'Safaricom M-Pesa Inbound Funds in Clearing', 'ASSET'],
  ] as const) {
    await prisma.ledgerAccount.upsert({
      where: { code },
      update: {},
      create: {
        code,
        name,
        type,
        currency: 'KES',
      },
    });
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
