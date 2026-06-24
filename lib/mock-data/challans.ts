import type { Challan } from "@/types";
import { mockVendors } from "@/lib/mock-data/vendors";
import { getVendorChallanDetails } from "@/lib/vendor";

const vendorDetails = (id: string) => {
  const vendor = mockVendors.find((entry) => entry.id === id);
  return vendor
    ? getVendorChallanDetails(vendor)
    : { vendorName: "", vendorAddress: "", vendorPersonName: "", vendorContact: "" };
};

export const mockChallans: Challan[] = [
  {
    id: "chl-001",
    challanNumber: "OC-2026-0156",
    date: "2026-06-01",
    ...vendorDetails("ven-004"),
    vehicleNumber: "GJ-01-AB-4521",
    driverName: "Ramesh Yadav",
    remarks: "Project Orion delivery",
    type: "outward",
    items: [
      {
        profileCode: "MAG-6063-T5-001",
        profileName: "Sliding Window Frame 50mm",
        profileImage: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=200&h=120&fit=crop",
        length: 6,
        qty: 100,
        weight: 744,
      },
      {
        profileCode: "MAG-6063-T5-008",
        profileName: "Glazing Bead 18mm",
        profileImage: "https://images.unsplash.com/photo-1565008576549-57569a49371d?w=200&h=120&fit=crop",
        length: 6,
        qty: 200,
        weight: 336,
      },
    ],
  },
  {
    id: "chl-002",
    challanNumber: "PC-2026-0034",
    date: "2026-06-02",
    ...vendorDetails("ven-021"),
    vehicleNumber: "GJ-06-CD-7890",
    driverName: "Suresh Patel",
    remarks: "Powder coating batch - Black finish",
    type: "powder_coating",
    color: "Blue",
    items: [
      {
        profileCode: "MAG-6063-T5-005",
        profileName: "Curtain Wall Mullion 65mm",
        profileImage: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200&h=120&fit=crop",
        length: 6,
        qty: 40,
        weight: 444,
      },
    ],
  },
  {
    id: "chl-003",
    challanNumber: "PC-2026-0033",
    date: "2026-06-01",
    ...vendorDetails("ven-021"),
    vehicleNumber: "MH-12-EF-3344",
    driverName: "Mahesh Desai",
    type: "powder_coating",
    color: "Yellow",
    items: [
      {
        profileCode: "MAG-6061-T6-007",
        profileName: "Sliding Door Rail 80mm",
        profileImage: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=120&fit=crop",
        length: 6,
        qty: 50,
        weight: 735,
      },
    ],
  },
  {
    id: "chl-004",
    challanNumber: "RET-2026-0008",
    date: "2026-06-03",
    ...vendorDetails("ven-004"),
    vehicleNumber: "GJ-06-CD-7890",
    driverName: "Suresh Patel",
    remarks: "Return from coating - Champagne Gold batch",
    type: "return",
    items: [
      {
        profileCode: "MAG-6063-T5-005",
        profileName: "Curtain Wall Mullion 65mm",
        profileImage: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200&h=120&fit=crop",
        length: 6,
        qty: 35,
        weight: 388.5,
      },
    ],
  },
  {
    id: "chl-005",
    challanNumber: "OC-2026-0157",
    date: "2026-06-02",
    ...vendorDetails("ven-005"),
    vehicleNumber: "DL-4C-AB-1122",
    driverName: "Vijay Kumar",
    type: "outward",
    items: [
      {
        profileCode: "MAG-6063-T5-002",
        profileName: "Casement Window Sash 42mm",
        profileImage: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=120&fit=crop",
        length: 6,
        qty: 80,
        weight: 470.4,
      },
    ],
  },
  {
    id: "chl-006",
    challanNumber: "PC-2026-0035",
    date: "2026-06-03",
    ...vendorDetails("ven-021"),
    vehicleNumber: "GJ-27-GH-5566",
    driverName: "Prakash Shah",
    remarks: "Wood finish - pending dispatch",
    type: "powder_coating",
    color: "Green",
    items: [
      {
        profileCode: "MAG-6063-T5-001",
        profileName: "Sliding Window Frame 50mm",
        profileImage: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=200&h=120&fit=crop",
        length: 6,
        qty: 80,
        weight: 595.2,
      },
    ],
  },
  {
    id: "chl-007",
    challanNumber: "PC-2026-0030",
    date: "2026-05-25",
    ...vendorDetails("ven-021"),
    vehicleNumber: "GJ-06-CD-7890",
    driverName: "Suresh Patel",
    type: "powder_coating",
    color: "Blue",
    items: [
      {
        profileCode: "MAG-6063-T5-004",
        profileName: "Louvre Blade 25mm",
        profileImage: "https://images.unsplash.com/photo-1565008576549-57569a49371d?w=200&h=120&fit=crop",
        length: 6,
        qty: 200,
        weight: 540,
      },
    ],
  },
];
