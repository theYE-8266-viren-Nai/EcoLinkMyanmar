export const MATERIALS = [
  { slug: "pet-plastic", name: "PET plastic", pointsPerKg: 50 },
  { slug: "rigid-plastic", name: "Rigid plastic", pointsPerKg: 40 },
  { slug: "paper", name: "Paper", pointsPerKg: 20 },
  { slug: "cardboard", name: "Cardboard", pointsPerKg: 20 },
  { slug: "glass", name: "Glass", pointsPerKg: 25 },
  { slug: "aluminium", name: "Aluminium", pointsPerKg: 80 },
  { slug: "steel", name: "Steel", pointsPerKg: 35 },
  { slug: "e-waste", name: "E-waste", pointsPerKg: 80 },
  { slug: "batteries", name: "Batteries", pointsPerKg: 60 },
] as const;

export type MaterialSlug = (typeof MATERIALS)[number]["slug"];

export const PARTNER_CENTERS = [
  {
    id: "hlaing-ecopoint",
    name: "Hlaing EcoPoint",
    township: "Hlaing Township",
    address: "Insein Road near Hledan",
    hours: "8:30 AM-6:00 PM",
    latitude: 16.8436,
    longitude: 96.1305,
    materials: ["pet-plastic", "rigid-plastic", "paper", "cardboard", "glass", "aluminium", "steel"] as MaterialSlug[],
  },
  {
    id: "insein-green-hub",
    name: "Insein Green Hub",
    township: "Insein Township",
    address: "Lower Mingaladon Road",
    hours: "9:00 AM-5:30 PM",
    latitude: 16.8898,
    longitude: 96.1098,
    materials: ["pet-plastic", "rigid-plastic", "paper", "cardboard", "glass"] as MaterialSlug[],
  },
  {
    id: "lanmadaw-material-bank",
    name: "Lanmadaw Material Bank",
    township: "Lanmadaw Township",
    address: "Maha Bandula Road",
    hours: "8:00 AM-5:00 PM",
    latitude: 16.777,
    longitude: 96.1401,
    materials: ["pet-plastic", "paper", "cardboard", "glass", "aluminium"] as MaterialSlug[],
  },
  {
    id: "tamwe-community-dropoff",
    name: "Tamwe Community Drop-off",
    township: "Tamwe Township",
    address: "U Chit Maung Road",
    hours: "9:00 AM-6:00 PM",
    latitude: 16.8103,
    longitude: 96.1761,
    materials: ["pet-plastic", "paper", "aluminium", "steel"] as MaterialSlug[],
  },
  {
    id: "yankin-circular-center",
    name: "Yankin Circular Center",
    township: "Yankin Township",
    address: "Saya San Road",
    hours: "8:30 AM-5:30 PM",
    latitude: 16.8273,
    longitude: 96.1737,
    materials: ["pet-plastic", "paper", "cardboard", "e-waste", "batteries"] as MaterialSlug[],
  },
] as const;

export const PARTNER_REWARDS = [
  {
    id: "market-tote",
    databaseId: "20000000-0000-0000-0000-000000000001",
    centerId: "hlaing-ecopoint",
    partner: "Hlaing EcoPoint",
    township: "Hlaing Township",
    title: "Reusable market tote",
    description: "A sturdy washable bag for groceries and everyday errands.",
    points: 150,
    stock: 24,
    imageUrl: "https://images.unsplash.com/photo-1597484662317-9bd7bdda2907?auto=format&fit=crop&w=960&q=80",
  },
  {
    id: "herb-seedling",
    databaseId: "20000000-0000-0000-0000-000000000002",
    centerId: null,
    partner: "Yangon Seedling Circle",
    township: "Kamayut Township",
    title: "Kitchen herb seedling",
    description: "Choose one seasonal herb prepared for a balcony or windowsill.",
    points: 250,
    stock: 18,
    imageUrl: "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=960&q=80",
  },
  {
    id: "refill-discount",
    databaseId: "20000000-0000-0000-0000-000000000003",
    centerId: null,
    partner: "Doh Refill Corner",
    township: "Sanchaung Township",
    title: "15% refill discount",
    description: "Use one voucher on household refill products brought in your own container.",
    points: 350,
    stock: 60,
    imageUrl: "https://images.unsplash.com/photo-1604342427523-189b17048853?auto=format&fit=crop&w=960&q=80",
  },
  {
    id: "sorting-kit",
    databaseId: "20000000-0000-0000-0000-000000000004",
    centerId: "hlaing-ecopoint",
    partner: "Hlaing EcoPoint",
    township: "Hlaing Township",
    title: "Home sorting starter kit",
    description: "Three reusable labels and fold-flat bags for separating dry recyclables.",
    points: 500,
    stock: 8,
    imageUrl: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=960&q=80",
  },
] as const;

export const STAFF_ACCESS_CODE = "ECO-STAFF";
export const DEMO_MEMBER_CODE = "ECO-MM-1048";
export const STAFF_CENTER_ID = "hlaing-ecopoint";

export type DropOff = {
  id: string;
  centerId: string;
  materialSlug: MaterialSlug;
  weightKg: number;
  points: number;
  recordedAt: string;
};

export type RewardRedemption = {
  id: string;
  rewardId: string;
  claimCode: string;
  status: "reserved" | "fulfilled";
  createdAt: string;
};

export type EcoNotification = {
  id: string;
  title: string;
  message: string;
  href: string;
  read: boolean;
  createdAt: string;
};

export type EnvironmentReport = {
  id: string;
  issueType: string;
  severity: string;
  location: string;
  notes: string;
  createdAt: string;
};

export type EcoLinkState = {
  user: { displayName: string; memberCode: string };
  openingBalance: number;
  dropOffs: DropOff[];
  redemptions: RewardRedemption[];
  notifications: EcoNotification[];
  reports: EnvironmentReport[];
  cleanupContribution: number;
};

export const INITIAL_STATE: EcoLinkState = {
  user: { displayName: "Mya Thiri", memberCode: DEMO_MEMBER_CODE },
  openingBalance: 0,
  dropOffs: [
    { id: "drop-1", centerId: "hlaing-ecopoint", materialSlug: "pet-plastic", weightKg: 3, points: 150, recordedAt: "2026-07-14T09:30:00.000Z" },
    { id: "drop-2", centerId: "lanmadaw-material-bank", materialSlug: "paper", weightKg: 6, points: 120, recordedAt: "2026-07-09T10:15:00.000Z" },
    { id: "drop-3", centerId: "hlaing-ecopoint", materialSlug: "pet-plastic", weightKg: 5, points: 250, recordedAt: "2026-06-28T08:45:00.000Z" },
    { id: "drop-4", centerId: "yankin-circular-center", materialSlug: "e-waste", weightKg: 2, points: 160, recordedAt: "2026-06-18T12:00:00.000Z" },
  ],
  redemptions: [],
  notifications: [
    { id: "notification-1", title: "Center hours updated", message: "Hlaing EcoPoint is open until 6:00 PM today.", href: "/recycle", read: false, createdAt: "2026-07-17T06:30:00.000Z" },
  ],
  reports: [],
  cleanupContribution: 0,
};

export function calculatePoints(materialSlug: MaterialSlug, weightKg: number) {
  const material = MATERIALS.find((item) => item.slug === materialSlug);
  if (!material || !Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 500) {
    throw new Error("Choose a material and enter a weight between 0 and 500 kg.");
  }
  return Math.max(1, Math.round(material.pointsPerKg * weightKg));
}

export function materialName(slug: MaterialSlug) {
  return MATERIALS.find((material) => material.slug === slug)?.name ?? slug;
}
