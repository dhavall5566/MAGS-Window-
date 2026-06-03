const fs = require("fs");
const path = require("path");

const seedPath = path.join(process.cwd(), "data", "database.json");
if (fs.existsSync(seedPath)) {
  console.log("data/database.json already exists");
  process.exit(0);
}

const now = new Date().toISOString();
const ago = (days) => new Date(Date.now() - days * 86400000).toISOString();

const outwardWeight = 146.4;
const db = {
  users: [
    { id: "user-admin", name: "System Administrator", email: "admin@mags.com", role: "ADMINISTRATOR", status: "ACTIVE", createdAt: now, updatedAt: now },
    { id: "user-store", name: "Rajesh Kumar", email: "store@mags.com", role: "STORE_MANAGER", status: "ACTIVE", createdAt: now, updatedAt: now },
    { id: "user-prod", name: "Amit Sharma", email: "production@mags.com", role: "PRODUCTION_USER", status: "ACTIVE", createdAt: now, updatedAt: now },
  ],
  profiles: [
    { id: "prof-1", profileCode: "AP-6013", profileName: "Sliding Window Frame", seriesName: "6000 Series", weightPerMeter: 2.44, standardLength: 6, description: "Standard sliding window", status: "ACTIVE", currentStock: 1103.6, powderCoatedStock: 0, lowStockThreshold: 100, createdAt: now, updatedAt: now },
    { id: "prof-2", profileCode: "AP-6020", profileName: "Casement Window Sash", seriesName: "6000 Series", weightPerMeter: 1.85, standardLength: 6, description: "Casement sash", status: "ACTIVE", currentStock: 890, powderCoatedStock: 0, lowStockThreshold: 80, createdAt: now, updatedAt: now },
    { id: "prof-3", profileCode: "AP-5010", profileName: "Door Frame Profile", seriesName: "5000 Series", weightPerMeter: 3.12, standardLength: 6, description: "Door frame", status: "ACTIVE", currentStock: 45, powderCoatedStock: 0, lowStockThreshold: 50, createdAt: now, updatedAt: now },
    { id: "prof-4", profileCode: "AP-7025", profileName: "Curtain Wall Mullion", seriesName: "7000 Series", weightPerMeter: 4.56, standardLength: 6, description: "Mullion", status: "ACTIVE", currentStock: 2100, powderCoatedStock: 0, lowStockThreshold: 200, createdAt: now, updatedAt: now },
    { id: "prof-5", profileCode: "AP-3015", profileName: "Louvre Blade", seriesName: "3000 Series", weightPerMeter: 0.95, standardLength: 6, description: "Louvre", status: "ACTIVE", currentStock: 320, powderCoatedStock: 0, lowStockThreshold: 100, createdAt: now, updatedAt: now },
    { id: "prof-6", profileCode: "AP-8040", profileName: "Structural Beam", seriesName: "8000 Series", weightPerMeter: 6.78, standardLength: 6, description: "Beam", status: "ACTIVE", currentStock: 1580, powderCoatedStock: 0, lowStockThreshold: 150, createdAt: now, updatedAt: now },
  ],
  stockInwards: [
    { id: "si-1", profileId: "prof-1", quantity: 100, length: 600, weight: 500, date: ago(30), remarks: "Initial", createdAt: ago(30) },
  ],
  consumptions: [{ id: "con-1", profileId: "prof-1", quantity: 10, unit: "METER", calculatedWeight: 24.4, date: ago(5), remarks: "Batch 101", createdAt: ago(5) }],
  powderCoatings: [
    { id: "pc-1", profileId: "prof-2", quantity: 50, weight: 92.5, color: "DARK_BRONZE", transferDate: ago(10), status: "IN_PROCESS", createdAt: ago(10), updatedAt: ago(10) },
    { id: "pc-2", profileId: "prof-3", quantity: 30, weight: 93.6, color: "WHITE", transferDate: ago(20), status: "COMPLETED", createdAt: ago(20), updatedAt: ago(20) },
  ],
  scrapWastes: [{ id: "sc-1", profileId: "prof-1", quantity: 12.5, reason: "CUTTING_WASTE", date: ago(3), createdAt: ago(3) }],
  stockLedgers: [
    { id: "sl-1", profileId: "prof-1", transactionType: "STOCK_INWARD", quantity: 500, balance: 1250, userId: "user-admin", date: ago(30), createdAt: ago(30) },
    { id: "sl-2", profileId: "prof-1", transactionType: "CHALLAN_OUTWARD", quantity: -outwardWeight, balance: 1103.6, userId: "user-admin", date: ago(2), remarks: "MAGS/OUT/2026/0001", createdAt: ago(2) },
  ],
  activityLogs: [],
  notifications: [
    { id: "n-1", userId: "user-admin", title: "Welcome to MAGS", message: "System ready.", read: false, type: "info", createdAt: now },
    { id: "n-2", userId: "user-admin", title: "Low Stock Alert", message: "AP-5010 below threshold.", read: false, type: "warning", createdAt: now },
  ],
  vendors: [
    { id: "ven-1", name: "Shree Powder Coating Works", contactPerson: "Ramesh Patel", phone: "+91 9876543210", address: "Ognaj, Ahmedabad", gstin: "24AAAAA0000A1Z5", status: "ACTIVE", createdAt: now, updatedAt: now },
    { id: "ven-2", name: "Gujarat Anodizing & Coating", contactPerson: "Mahesh Shah", phone: "+91 9898989898", address: "Science City Road, Ahmedabad", status: "ACTIVE", createdAt: now, updatedAt: now },
  ],
  projects: [{ id: "proj-1", projectCode: "PRJ-2026-001", projectName: "Skyline Tower Facade", clientName: "ABC Developers", siteAddress: "Science City, Ahmedabad", status: "ACTIVE", createdAt: now, updatedAt: now }],
  projectProfiles: [
    { id: "pp-1", projectId: "proj-1", profileId: "prof-1", plannedQty: 20, plannedLength: 6 },
    { id: "pp-2", projectId: "proj-1", profileId: "prof-2", plannedQty: 15, plannedLength: 6 },
  ],
  challans: [
    { id: "ch-1", challanNumber: "MAGS/OUT/2026/0001", type: "OUTWARD", status: "ISSUED", vendorId: "ven-1", projectId: "proj-1", vehicleNo: "GJ-01-AB-1234", driverName: "Suresh", totalWeight: outwardWeight, totalQty: 10, preparedBy: "System Administrator", verifiedToken: "tok-out-001", issueDate: ago(2), createdAt: ago(2), updatedAt: ago(2) },
    { id: "ch-2", challanNumber: "MAGS/PC/2026/0001", type: "POWDER_COATING", status: "SENT_FOR_COATING", vendorId: "ven-2", parentChallanId: "ch-1", color: "DARK_BRONZE", totalWeight: outwardWeight, totalQty: 10, preparedBy: "System Administrator", verifiedToken: "tok-pc-001", issueDate: ago(1), createdAt: ago(1), updatedAt: ago(1) },
  ],
  challanItems: [
    { id: "ci-1", challanId: "ch-1", profileId: "prof-1", quantity: 10, length: 6, weight: outwardWeight },
    { id: "ci-2", challanId: "ch-2", profileId: "prof-1", quantity: 10, length: 6, weight: outwardWeight },
  ],
};

fs.mkdirSync(path.dirname(seedPath), { recursive: true });
fs.writeFileSync(seedPath, JSON.stringify(db, null, 2));
console.log("Created data/database.json");
