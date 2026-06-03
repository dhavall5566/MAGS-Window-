import {
  PrismaClient,
  UserRole,
  PowderCoatingColor,
  PowderCoatingStatus,
  ScrapReason,
  ConsumptionUnit,
  ChallanType,
  ChallanStatus,
  TransactionType,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding MAGS database...");

  const password = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@mags.com" },
    update: {},
    create: {
      name: "System Administrator",
      email: "admin@mags.com",
      password,
      role: UserRole.ADMINISTRATOR,
    },
  });

  await prisma.user.upsert({
    where: { email: "store@mags.com" },
    update: {},
    create: {
      name: "Rajesh Kumar",
      email: "store@mags.com",
      password,
      role: UserRole.STORE_MANAGER,
    },
  });

  await prisma.user.upsert({
    where: { email: "production@mags.com" },
    update: {},
    create: {
      name: "Amit Sharma",
      email: "production@mags.com",
      password,
      role: UserRole.PRODUCTION_USER,
    },
  });

  const profiles = [
    {
      profileCode: "AP-6013",
      profileName: "Sliding Window Frame",
      seriesName: "6000 Series",
      weightPerMeter: 2.44,
      standardLength: 6,
      description: "Standard sliding window aluminium profile",
      currentStock: 1250,
      lowStockThreshold: 100,
    },
    {
      profileCode: "AP-6020",
      profileName: "Casement Window Sash",
      seriesName: "6000 Series",
      weightPerMeter: 1.85,
      standardLength: 6,
      description: "Casement window sash profile",
      currentStock: 890,
      lowStockThreshold: 80,
    },
    {
      profileCode: "AP-5010",
      profileName: "Door Frame Profile",
      seriesName: "5000 Series",
      weightPerMeter: 3.12,
      standardLength: 6,
      description: "Heavy duty door frame profile",
      currentStock: 45,
      lowStockThreshold: 50,
    },
    {
      profileCode: "AP-7025",
      profileName: "Curtain Wall Mullion",
      seriesName: "7000 Series",
      weightPerMeter: 4.56,
      standardLength: 6,
      description: "Structural curtain wall mullion",
      currentStock: 2100,
      lowStockThreshold: 200,
    },
    {
      profileCode: "AP-3015",
      profileName: "Louvre Blade",
      seriesName: "3000 Series",
      weightPerMeter: 0.95,
      standardLength: 6,
      description: "Louvre blade profile for ventilation",
      currentStock: 320,
      lowStockThreshold: 100,
    },
    {
      profileCode: "AP-8040",
      profileName: "Structural Beam",
      seriesName: "8000 Series",
      weightPerMeter: 6.78,
      standardLength: 6,
      description: "Heavy structural beam profile",
      currentStock: 1580,
      lowStockThreshold: 150,
    },
  ];

  for (const p of profiles) {
    await prisma.profile.upsert({
      where: { profileCode: p.profileCode },
      update: {},
      create: p,
    });
  }

  const allProfiles = await prisma.profile.findMany();

  for (const profile of allProfiles.slice(0, 3)) {
    await prisma.stockInward.create({
      data: {
        profileId: profile.id,
        quantity: 100,
        length: 600,
        weight: 500,
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        remarks: "Initial stock",
      },
    });
    await prisma.stockLedger.create({
      data: {
        profileId: profile.id,
        transactionType: "STOCK_INWARD",
        quantity: 500,
        balance: profile.currentStock,
        userId: admin.id,
        remarks: "Seed inward",
      },
    });
  }

  const p1 = allProfiles[0];
  await prisma.consumption.create({
    data: {
      profileId: p1.id,
      quantity: 10,
      unit: ConsumptionUnit.METER,
      calculatedWeight: 10 * p1.weightPerMeter,
      remarks: "Production batch #101",
    },
  });

  await prisma.powderCoating.create({
    data: {
      profileId: allProfiles[1].id,
      quantity: 50,
      weight: 92.5,
      color: PowderCoatingColor.DARK_BRONZE,
      status: PowderCoatingStatus.IN_PROCESS,
    },
  });

  await prisma.powderCoating.create({
    data: {
      profileId: allProfiles[2].id,
      quantity: 30,
      weight: 93.6,
      color: PowderCoatingColor.WHITE,
      status: PowderCoatingStatus.COMPLETED,
    },
  });

  await prisma.scrapWaste.create({
    data: {
      profileId: p1.id,
      quantity: 12.5,
      reason: ScrapReason.CUTTING_WASTE,
      remarks: "End piece waste",
    },
  });

  await prisma.notification.create({
    data: {
      userId: admin.id,
      title: "Welcome to MAGS",
      message: "Your aluminium profile management system is ready.",
      type: "info",
    },
  });

  await prisma.notification.create({
    data: {
      userId: admin.id,
      title: "Low Stock Alert",
      message: "Profile AP-5010 (Door Frame) is below threshold.",
      type: "warning",
    },
  });

  const vendor1 = await prisma.vendor.create({
    data: {
      name: "Shree Powder Coating Works",
      contactPerson: "Ramesh Patel",
      phone: "+91 9876543210",
      address: "Ognaj, Ahmedabad",
      gstin: "24AAAAA0000A1Z5",
    },
  });

  const vendor2 = await prisma.vendor.create({
    data: {
      name: "Gujarat Anodizing & Coating",
      contactPerson: "Mahesh Shah",
      phone: "+91 9898989898",
      address: "Science City Road, Ahmedabad",
    },
  });

  const project = await prisma.project.create({
    data: {
      projectCode: "PRJ-2026-001",
      projectName: "Skyline Tower Facade",
      clientName: "ABC Developers",
      siteAddress: "Science City, Ahmedabad",
      profiles: {
        create: [
          { profileId: allProfiles[0].id, plannedQty: 20, plannedLength: 6 },
          { profileId: allProfiles[1].id, plannedQty: 15, plannedLength: 6 },
        ],
      },
    },
  });

  const outwardWeight = 10 * 6 * p1.weightPerMeter;
  const outward = await prisma.challan.create({
    data: {
      challanNumber: "MAGS/OUT/2026/0001",
      type: ChallanType.OUTWARD,
      status: ChallanStatus.ISSUED,
      vendorId: vendor1.id,
      projectId: project.id,
      vehicleNo: "GJ-01-AB-1234",
      driverName: "Suresh",
      totalWeight: outwardWeight,
      totalQty: 10,
      preparedBy: admin.name,
      items: {
        create: [
          {
            profileId: p1.id,
            quantity: 10,
            length: 6,
            weight: outwardWeight,
          },
        ],
      },
    },
  });

  const updatedP1 = await prisma.profile.update({
    where: { id: p1.id },
    data: { currentStock: { decrement: outwardWeight } },
  });

  await prisma.stockLedger.create({
    data: {
      profileId: p1.id,
      transactionType: TransactionType.CHALLAN_OUTWARD,
      quantity: -outwardWeight,
      balance: updatedP1.currentStock,
      userId: admin.id,
      remarks: `Outward Challan ${outward.challanNumber}`,
    },
  });

  await prisma.challan.create({
    data: {
      challanNumber: "MAGS/PC/2026/0001",
      type: ChallanType.POWDER_COATING,
      status: ChallanStatus.SENT_FOR_COATING,
      vendorId: vendor2.id,
      parentChallanId: outward.id,
      color: PowderCoatingColor.DARK_BRONZE,
      totalWeight: outwardWeight,
      totalQty: 10,
      preparedBy: admin.name,
      items: {
        create: [
          {
            profileId: p1.id,
            quantity: 10,
            length: 6,
            weight: outwardWeight,
          },
        ],
      },
    },
  });

  console.log("Seed completed!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
