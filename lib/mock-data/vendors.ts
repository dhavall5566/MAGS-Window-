import type { Vendor, VendorType } from "@/types";
import { COMPANY, DELIVERY_CHALLAN } from "@/lib/company";
import { MAGS_OUTWARD_CHALLAN_VENDOR_ID } from "@/lib/outward-challan-branding";

const vendorRows: Pick<
  Vendor,
  | "id"
  | "partyName"
  | "partyAddress"
  | "vendorType"
  | "gstNo"
  | "challanHeaderName"
  | "challanAddressLine1"
  | "challanAddressLine2"
  | "challanEmail"
  | "challanPhone"
  | "challanSignatoryLine"
>[] = [
  {
    id: MAGS_OUTWARD_CHALLAN_VENDOR_ID,
    partyName: "MAGS",
    partyAddress: `${DELIVERY_CHALLAN.addressLine1}, ${DELIVERY_CHALLAN.addressLine2}`,
    vendorType: "outward_challan",
    gstNo: DELIVERY_CHALLAN.gstNo,
    challanHeaderName: DELIVERY_CHALLAN.name,
    challanAddressLine1: DELIVERY_CHALLAN.addressLine1,
    challanAddressLine2: DELIVERY_CHALLAN.addressLine2,
    challanEmail: DELIVERY_CHALLAN.email,
    challanPhone: COMPANY.contact.phone,
    challanSignatoryLine: DELIVERY_CHALLAN.signatoryLine,
  },
  {
    id: "ven-001",
    partyName: "CLASSIC ELECTROCOATING PVT LTD",
    partyAddress:
      "212,213 PUSHPAM IND. ESTATE, PAHSE-1, NIKA TUBE COMPOUND, GIDC, VATVA, AHMEDABAD-382445",
    vendorType: "delivery",
  },
  {
    id: "ven-002",
    partyName: "REAL ARC COATING",
    partyAddress:
      "SURVEY NO.969 OPP, SHREE KRISHNA SUPHITE, NR. CITIZEN SOLAR, INDRAD-ANKHOL ROAD, KADI-382715",
    vendorType: "delivery",
  },
  {
    id: "ven-003",
    partyName: "VIAAN COATERS",
    partyAddress:
      "PLOT NO-716/2, NEAR RONAK PLASTIC, OPP: NEW HAVEN TATA HOUSING, SCHEM, SANTEJ-KALOL ROAD, VADSAR",
    vendorType: "delivery",
  },
  {
    id: "ven-004",
    partyName: "SPARKEL WINDOWS SYSTEM PVT LTD",
    partyAddress: "SHOWROOM NO-5, BINORI B SQUARE-2, ISKON AMBLI ROAD, AHMEDABAD",
    vendorType: "delivery",
  },
  {
    id: "ven-005",
    partyName: "UMA ALU GLASS",
    partyAddress:
      "29, ARIES INDUSTRIAL PARK-1, NR. GIDC, PHASE -4, DHANOT, CHHATRAL-382729",
    vendorType: "delivery",
  },
  {
    id: "ven-006",
    partyName: "ELEVEN ENGINEERS",
    partyAddress:
      "SHED NO-2, SURVEY NO-49/1, OPP: GANGOTRI HOTEL, NR. KHATRAJ CHOKDI, KALOL, GANDHINAGAR-382721",
    vendorType: "delivery",
  },
  {
    id: "ven-007",
    partyName: "SEJAL WINDOWS & DOOR",
    partyAddress:
      "SURVEY NO-284 & 298, QUTUBULLAPUR MIAN ROAD, JEDDIMETLA, HYDRABAD-500055",
    vendorType: "delivery",
  },
  {
    id: "ven-008",
    partyName: "MEGA WINDOW",
    partyAddress: "DAYALBAND NEAR GURUDWARA, BILASPUR-495001",
    vendorType: "delivery",
  },
  {
    id: "ven-009",
    partyName: "AAIMA WINDOW CRAFT",
    partyAddress:
      "G-578, BANSI, 2ND PHASE, BEHIND NOBEL ART BANSI, JODHPUR, RAJASTHAN-342005",
    gstNo: "08AAKCA1234F1Z5",
    vendorType: "delivery",
  },
  {
    id: "ven-010",
    partyName: "MAHAVIR SALES",
    partyAddress: "B/12, JALARAM SOCIETY, NR.MORARJI GARDEN, ADAJAN, SURAT",
    vendorType: "delivery",
  },
  {
    id: "ven-011",
    partyName: "ESTHETICS",
    partyAddress:
      "A.B ROAD, OPP: C21MALL 314, PRINCESS BUSINESS SKY, INDOR, MADHYA PRADESH-452001",
    vendorType: "delivery",
  },
  {
    id: "ven-012",
    partyName: "CONCEPT SYSTEM",
    partyAddress:
      "SURVEY NO-9/2, GALI NO-6, MAHAPRABHU NAGAR IND ESTATE, LIMBAYAT, SURAT",
    vendorType: "delivery",
  },
  {
    id: "ven-013",
    partyName: "STREAMLINE SYSTEM WINDOW",
    partyAddress: "NO.1, BANKER BROTHERS ESTATE, NH08, PADAMALA, VADODARA-391350",
    vendorType: "delivery",
  },
  {
    id: "ven-014",
    partyName: "WINDOW ART ENTERPRISE",
    partyAddress:
      "A-303, GANESH GLORY-11, NEAR GANESH GENESIS, S.G HIGHWAY, AHMEDABAD-382481",
    vendorType: "delivery",
  },
  {
    id: "ven-015",
    partyName: "YD SYSTEMS",
    partyAddress: "GODOWN NO-1, SAINT MARYS, MELAMADAL, MADURAI, TAMILNADU-625020",
    vendorType: "delivery",
  },
  {
    id: "ven-016",
    partyName: "FENZO",
    partyAddress: "DOOR NO-21, BYPASS ROAD, AVANIPURAM, MADURI, TAMILNADU-625012",
    vendorType: "delivery",
  },
  {
    id: "ven-017",
    partyName: "PRIME DESIGN COMPANY",
    partyAddress: "SUR-30/1, SP-14/1, TP-115, NR. RAMOL TOOL TAX, RAMOL, AHMEABAD-382449",
    vendorType: "delivery",
  },
  {
    id: "ven-018",
    partyName: "UMA INDUSTRIES",
    partyAddress: "NO.45, 3RD PHASE, 4TH MAIN PEENYA INDUSTRIAL AREA, BENGALURU-560058",
    vendorType: "delivery",
  },
  {
    id: "ven-019",
    partyName: "J B ALU FEB",
    partyAddress:
      "PLOT NO-09, SER.NO-7210, ADITYA DALMOND INDUSTRIES AND WHOLSALES MARKET, PALANPUR, JAGAN ROAD, JAGAN CHEHAR DHAM, BANASKANTHA-385001",
    vendorType: "delivery",
  },
  {
    id: "ven-020",
    partyName: "DHABARIYA POLYWOOD LTD",
    partyAddress:
      "SP2032A, RAMCHANDRAPURA INDUSTRIES AREA, SITAPUR EXTENSION, SITAPUR, JAIPUR -RAJASTHAN-302017",
    vendorType: "delivery",
  },
  {
    id: "ven-021",
    partyName: "MAGS",
    partyAddress: COMPANY.address.full,
    vendorType: "powder_coating",
  },
  {
    id: "ven-022",
    partyName: "Umiya",
    partyAddress: "Plot 12, GIDC Industrial Estate, Ahmedabad, Gujarat",
    vendorType: "powder_coating",
  },
  {
    id: "ven-023",
    partyName: "Sreenathji-1",
    partyAddress: "Ahmedabad, Gujarat",
    vendorType: "suppliers",
  },
  {
    id: "ven-024",
    partyName: "Sreenathji-2",
    partyAddress: "Ahmedabad, Gujarat",
    vendorType: "suppliers",
  },
  {
    id: "ven-025",
    partyName: "Sreenathji-3",
    partyAddress: "Ahmedabad, Gujarat",
    vendorType: "suppliers",
  },
  {
    id: "ven-026",
    partyName: "Sreenathji-4",
    partyAddress: "Ahmedabad, Gujarat",
    vendorType: "suppliers",
  },
  {
    id: "ven-027",
    partyName: "Sreenathji-5",
    partyAddress: "Ahmedabad, Gujarat",
    vendorType: "suppliers",
  },
];

export const mockVendors: Vendor[] = vendorRows.map((vendor) => ({
  ...vendor,
  personName: vendor.id === "ven-021" ? COMPANY.contact.name : "",
  phoneNo: vendor.id === "ven-021" ? COMPANY.contact.phone : "",
  email: vendor.id === "ven-021" ? COMPANY.contact.email : "",
  gstNo: vendor.gstNo ?? "",
}));
