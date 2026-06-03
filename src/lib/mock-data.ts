import type { Database } from "./types";

/** Demo data — no PostgreSQL or Prisma required. */
export const initialMockDatabase: Database = {
  "users": [
    {
      "id": "user-admin",
      "name": "System Administrator",
      "email": "admin@mags.com",
      "role": "ADMINISTRATOR",
      "status": "ACTIVE",
      "createdAt": "2026-06-03T13:48:33.452Z",
      "updatedAt": "2026-06-03T13:48:33.452Z"
    },
    {
      "id": "user-store",
      "name": "Rajesh Kumar",
      "email": "store@mags.com",
      "role": "STORE_MANAGER",
      "status": "ACTIVE",
      "createdAt": "2026-06-03T13:48:33.452Z",
      "updatedAt": "2026-06-03T13:48:33.452Z"
    },
    {
      "id": "user-prod",
      "name": "Amit Sharma",
      "email": "production@mags.com",
      "role": "PRODUCTION_USER",
      "status": "ACTIVE",
      "createdAt": "2026-06-03T13:48:33.452Z",
      "updatedAt": "2026-06-03T13:48:33.452Z"
    }
  ],
  "profiles": [
    {
      "id": "prof-1",
      "profileCode": "AP-6013",
      "profileName": "Sliding Window Frame",
      "seriesName": "6000 Series",
      "weightPerMeter": 2.44,
      "standardLength": 6,
      "description": "Standard sliding window",
      "status": "ACTIVE",
      "currentStock": 1103.6,
      "powderCoatedStock": 0,
      "lowStockThreshold": 100,
      "createdAt": "2026-06-03T13:48:33.452Z",
      "updatedAt": "2026-06-03T13:48:33.452Z"
    },
    {
      "id": "prof-2",
      "profileCode": "AP-6020",
      "profileName": "Casement Window Sash",
      "seriesName": "6000 Series",
      "weightPerMeter": 1.85,
      "standardLength": 6,
      "description": "Casement sash",
      "status": "ACTIVE",
      "currentStock": 890,
      "powderCoatedStock": 0,
      "lowStockThreshold": 80,
      "createdAt": "2026-06-03T13:48:33.452Z",
      "updatedAt": "2026-06-03T13:48:33.452Z"
    },
    {
      "id": "prof-3",
      "profileCode": "AP-5010",
      "profileName": "Door Frame Profile",
      "seriesName": "5000 Series",
      "weightPerMeter": 3.12,
      "standardLength": 6,
      "description": "Door frame",
      "status": "ACTIVE",
      "currentStock": 45,
      "powderCoatedStock": 0,
      "lowStockThreshold": 50,
      "createdAt": "2026-06-03T13:48:33.452Z",
      "updatedAt": "2026-06-03T13:48:33.452Z"
    },
    {
      "id": "prof-4",
      "profileCode": "AP-7025",
      "profileName": "Curtain Wall Mullion",
      "seriesName": "7000 Series",
      "weightPerMeter": 4.56,
      "standardLength": 6,
      "description": "Mullion",
      "status": "ACTIVE",
      "currentStock": 2100,
      "powderCoatedStock": 0,
      "lowStockThreshold": 200,
      "createdAt": "2026-06-03T13:48:33.452Z",
      "updatedAt": "2026-06-03T13:48:33.452Z"
    },
    {
      "id": "prof-5",
      "profileCode": "AP-3015",
      "profileName": "Louvre Blade",
      "seriesName": "3000 Series",
      "weightPerMeter": 0.95,
      "standardLength": 6,
      "description": "Louvre",
      "status": "ACTIVE",
      "currentStock": 320,
      "powderCoatedStock": 0,
      "lowStockThreshold": 100,
      "createdAt": "2026-06-03T13:48:33.452Z",
      "updatedAt": "2026-06-03T13:48:33.452Z"
    },
    {
      "id": "prof-6",
      "profileCode": "AP-8040",
      "profileName": "Structural Beam",
      "seriesName": "8000 Series",
      "weightPerMeter": 6.78,
      "standardLength": 6,
      "description": "Beam",
      "status": "ACTIVE",
      "currentStock": 1580,
      "powderCoatedStock": 0,
      "lowStockThreshold": 150,
      "createdAt": "2026-06-03T13:48:33.452Z",
      "updatedAt": "2026-06-03T13:48:33.452Z"
    }
  ],
  "stockInwards": [
    {
      "id": "si-1",
      "profileId": "prof-1",
      "quantity": 100,
      "length": 600,
      "weight": 500,
      "date": "2026-05-04T13:48:33.453Z",
      "remarks": "Initial",
      "createdAt": "2026-05-04T13:48:33.453Z"
    },
    {
      "id": "si-2",
      "profileId": "prof-2",
      "quantity": 100,
      "length": 600,
      "weight": 500,
      "date": "2026-05-04T13:48:33.453Z",
      "createdAt": "2026-05-04T13:48:33.453Z"
    },
    {
      "id": "si-3",
      "profileId": "prof-3",
      "quantity": 100,
      "length": 600,
      "weight": 500,
      "date": "2026-05-04T13:48:33.453Z",
      "createdAt": "2026-05-04T13:48:33.453Z"
    }
  ],
  "consumptions": [
    {
      "id": "con-1",
      "profileId": "prof-1",
      "quantity": 10,
      "unit": "METER",
      "calculatedWeight": 24.4,
      "date": "2026-05-29T13:48:33.453Z",
      "remarks": "Batch 101",
      "createdAt": "2026-05-29T13:48:33.453Z"
    }
  ],
  "powderCoatings": [
    {
      "id": "pc-1",
      "profileId": "prof-2",
      "quantity": 50,
      "weight": 92.5,
      "color": "DARK_BRONZE",
      "transferDate": "2026-05-24T13:48:33.453Z",
      "status": "IN_PROCESS",
      "createdAt": "2026-05-24T13:48:33.453Z",
      "updatedAt": "2026-05-24T13:48:33.453Z"
    },
    {
      "id": "pc-2",
      "profileId": "prof-3",
      "quantity": 30,
      "weight": 93.6,
      "color": "WHITE",
      "transferDate": "2026-05-14T13:48:33.453Z",
      "status": "COMPLETED",
      "createdAt": "2026-05-14T13:48:33.453Z",
      "updatedAt": "2026-05-14T13:48:33.453Z"
    }
  ],
  "scrapWastes": [
    {
      "id": "sc-1",
      "profileId": "prof-1",
      "quantity": 12.5,
      "reason": "CUTTING_WASTE",
      "date": "2026-05-31T13:48:33.453Z",
      "createdAt": "2026-05-31T13:48:33.453Z"
    }
  ],
  "stockLedgers": [
    {
      "id": "sl-1",
      "profileId": "prof-1",
      "transactionType": "STOCK_INWARD",
      "quantity": 500,
      "balance": 1250,
      "userId": "user-admin",
      "date": "2026-05-04T13:48:33.453Z",
      "createdAt": "2026-05-04T13:48:33.453Z"
    },
    {
      "id": "sl-2",
      "profileId": "prof-1",
      "transactionType": "CHALLAN_OUTWARD",
      "quantity": -146.4,
      "balance": 1103.6,
      "userId": "user-admin",
      "date": "2026-06-01T13:48:33.453Z",
      "remarks": "MAGS/OUT/2026/0001",
      "createdAt": "2026-06-01T13:48:33.453Z"
    }
  ],
  "activityLogs": [],
  "notifications": [
    {
      "id": "n-1",
      "userId": "user-admin",
      "title": "Welcome to MAGS",
      "message": "System ready.",
      "read": false,
      "type": "info",
      "createdAt": "2026-06-03T13:48:33.452Z"
    },
    {
      "id": "n-2",
      "userId": "user-admin",
      "title": "Low Stock Alert",
      "message": "AP-5010 below threshold.",
      "read": false,
      "type": "warning",
      "createdAt": "2026-06-03T13:48:33.452Z"
    }
  ],
  "vendors": [
    {
      "id": "ven-1",
      "name": "Shree Powder Coating Works",
      "contactPerson": "Ramesh Patel",
      "phone": "+91 9876543210",
      "address": "Ognaj, Ahmedabad",
      "gstin": "24AAAAA0000A1Z5",
      "status": "ACTIVE",
      "createdAt": "2026-06-03T13:48:33.452Z",
      "updatedAt": "2026-06-03T13:48:33.452Z"
    },
    {
      "id": "ven-2",
      "name": "Gujarat Anodizing & Coating",
      "contactPerson": "Mahesh Shah",
      "phone": "+91 9898989898",
      "address": "Science City Road, Ahmedabad",
      "status": "ACTIVE",
      "createdAt": "2026-06-03T13:48:33.452Z",
      "updatedAt": "2026-06-03T13:48:33.452Z"
    }
  ],
  "projects": [
    {
      "id": "proj-1",
      "projectCode": "PRJ-2026-001",
      "projectName": "Skyline Tower Facade",
      "clientName": "ABC Developers",
      "siteAddress": "Science City, Ahmedabad",
      "status": "ACTIVE",
      "createdAt": "2026-06-03T13:48:33.452Z",
      "updatedAt": "2026-06-03T13:48:33.452Z"
    }
  ],
  "projectProfiles": [
    {
      "id": "pp-1",
      "projectId": "proj-1",
      "profileId": "prof-1",
      "plannedQty": 20,
      "plannedLength": 6
    },
    {
      "id": "pp-2",
      "projectId": "proj-1",
      "profileId": "prof-2",
      "plannedQty": 15,
      "plannedLength": 6
    }
  ],
  "challans": [
    {
      "id": "ch-1",
      "challanNumber": "MAGS/OUT/2026/0001",
      "type": "OUTWARD",
      "status": "ISSUED",
      "vendorId": "ven-1",
      "projectId": "proj-1",
      "vehicleNo": "GJ-01-AB-1234",
      "driverName": "Suresh",
      "totalWeight": 146.4,
      "totalQty": 10,
      "preparedBy": "System Administrator",
      "verifiedToken": "tok-out-001",
      "issueDate": "2026-06-01T13:48:33.453Z",
      "createdAt": "2026-06-01T13:48:33.453Z",
      "updatedAt": "2026-06-01T13:48:33.453Z"
    },
    {
      "id": "ch-2",
      "challanNumber": "MAGS/PC/2026/0001",
      "type": "POWDER_COATING",
      "status": "SENT_FOR_COATING",
      "vendorId": "ven-2",
      "parentChallanId": "ch-1",
      "color": "DARK_BRONZE",
      "totalWeight": 146.4,
      "totalQty": 10,
      "preparedBy": "System Administrator",
      "verifiedToken": "tok-pc-001",
      "issueDate": "2026-06-02T13:48:33.453Z",
      "createdAt": "2026-06-02T13:48:33.453Z",
      "updatedAt": "2026-06-02T13:48:33.453Z"
    }
  ],
  "challanItems": [
    {
      "id": "ci-1",
      "challanId": "ch-1",
      "profileId": "prof-1",
      "quantity": 10,
      "length": 6,
      "weight": 146.4
    },
    {
      "id": "ci-2",
      "challanId": "ch-2",
      "profileId": "prof-1",
      "quantity": 10,
      "length": 6,
      "weight": 146.4
    }
  ]
} as Database;

export const mockUsers = initialMockDatabase.users;
export const mockProfiles = initialMockDatabase.profiles;
export const mockVendors = initialMockDatabase.vendors;
export const mockProjects = initialMockDatabase.projects;
export const mockChallans = initialMockDatabase.challans;
