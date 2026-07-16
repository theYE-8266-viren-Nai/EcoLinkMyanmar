import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

import {
  CampaignStatus,
  ContentStatus,
  OrganizationType,
  PrismaClient,
  RewardOfferStatus,
  VerificationStatus,
} from "../lib/generated/prisma/client.ts";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function upsertRewardOffer(input: {
  organizationId: string;
  title: string;
  description: string;
  pointsCost: number;
  quantityAvailable: number;
  imageUrl?: string;
}) {
  const existing = await prisma.rewardOffer.findFirst({
    where: {
      title: input.title,
      organizationId: input.organizationId,
      deletedAt: null,
    },
  });

  if (existing) {
    return prisma.rewardOffer.update({
      where: { id: existing.id },
      data: {
        description: input.description,
        pointsCost: input.pointsCost,
        quantityAvailable: input.quantityAvailable,
        status: RewardOfferStatus.ACTIVE,
        imageUrl: input.imageUrl,
      },
    });
  }

  return prisma.rewardOffer.create({
    data: {
      ...input,
      status: RewardOfferStatus.ACTIVE,
    },
  });
}

async function main() {
  const demoAuthor = await prisma.userProfile.upsert({
    where: { clerkUserId: "seed_clerk_ecolink_editor" },
    update: {
      displayName: "EcoLink Editorial Team",
      email: "editor@example.com",
      deletedAt: null,
    },
    create: {
      clerkUserId: "seed_clerk_ecolink_editor",
      displayName: "EcoLink Editorial Team",
      email: "editor@example.com",
      preferredLanguage: "en",
    },
  });

  const materialCategories = await Promise.all([
    prisma.materialCategory.upsert({
      where: { slug: "plastic" },
      update: {
        acceptedExamples: ["PET bottles", "HDPE containers", "clean plastic packaging"],
        rejectedExamples: ["medical plastic", "food-contaminated containers"],
        preparationInstructions: "Rinse, dry, and flatten where possible.",
        defaultRewardRate: 8,
        isActive: true,
      },
      create: {
        name: "Plastic",
        slug: "plastic",
        description: "Common recyclable plastic packaging and containers.",
        acceptedExamples: ["PET bottles", "HDPE containers", "clean plastic packaging"],
        rejectedExamples: ["medical plastic", "food-contaminated containers"],
        preparationInstructions: "Rinse, dry, and flatten where possible.",
        defaultRewardRate: 8,
      },
    }),
    prisma.materialCategory.upsert({
      where: { slug: "paper-cardboard" },
      update: {
        acceptedExamples: ["office paper", "cardboard boxes", "newspapers"],
        rejectedExamples: ["waxed paper", "wet cardboard"],
        preparationInstructions: "Keep dry and bundle similar paper together.",
        defaultRewardRate: 5,
        isActive: true,
      },
      create: {
        name: "Paper and Cardboard",
        slug: "paper-cardboard",
        description: "Dry paper goods and cardboard suitable for recycling.",
        acceptedExamples: ["office paper", "cardboard boxes", "newspapers"],
        rejectedExamples: ["waxed paper", "wet cardboard"],
        preparationInstructions: "Keep dry and bundle similar paper together.",
        defaultRewardRate: 5,
      },
    }),
    prisma.materialCategory.upsert({
      where: { slug: "metal" },
      update: {
        acceptedExamples: ["aluminum cans", "tin cans", "scrap metal"],
        rejectedExamples: ["pressurized cans", "paint containers"],
        preparationInstructions: "Empty containers and separate sharp objects safely.",
        defaultRewardRate: 12,
        isActive: true,
      },
      create: {
        name: "Metal",
        slug: "metal",
        description: "Household and community metal items accepted by recyclers.",
        acceptedExamples: ["aluminum cans", "tin cans", "scrap metal"],
        rejectedExamples: ["pressurized cans", "paint containers"],
        preparationInstructions: "Empty containers and separate sharp objects safely.",
        defaultRewardRate: 12,
      },
    }),
  ]);

  const recycler = await prisma.organization.upsert({
    where: { slug: "yangon-recycling-collective" },
    update: {
      name: "Yangon Recycling Collective",
      verificationStatus: VerificationStatus.APPROVED,
      deletedAt: null,
    },
    create: {
      name: "Yangon Recycling Collective",
      slug: "yangon-recycling-collective",
      organizationType: OrganizationType.RECYCLER,
      verificationStatus: VerificationStatus.APPROVED,
      description: "A demo recycling partner for pickup and sorting workflows.",
      contactEmail: "collective@example.com",
      contactPhone: "+95 9 000 000 001",
    },
  });

  const ngo = await prisma.organization.upsert({
    where: { slug: "green-school-network" },
    update: {
      name: "Green School Network",
      verificationStatus: VerificationStatus.APPROVED,
      deletedAt: null,
    },
    create: {
      name: "Green School Network",
      slug: "green-school-network",
      organizationType: OrganizationType.NGO,
      verificationStatus: VerificationStatus.APPROVED,
      description: "A demo NGO running recycling education and workshops.",
      contactEmail: "schools@example.com",
    },
  });

  for (const material of materialCategories) {
    await prisma.organizationAcceptedMaterial.upsert({
      where: {
        organizationId_materialCategoryId: {
          organizationId: recycler.id,
          materialCategoryId: material.id,
        },
      },
      update: { isActive: true },
      create: {
        organizationId: recycler.id,
        materialCategoryId: material.id,
        minimumWeightKg: "1.00",
        notes: "Seeded accepted material for demo pickup matching.",
      },
    });
  }

  await Promise.all([
    upsertRewardOffer({
      organizationId: recycler.id,
      title: "Reusable Tote Bag",
      description: "Redeem points for a durable EcoLink tote bag.",
      pointsCost: 120,
      quantityAvailable: 50,
    }),
    upsertRewardOffer({
      organizationId: ngo.id,
      title: "Workshop Priority Seat",
      description: "Reserve a priority seat at a community recycling workshop.",
      pointsCost: 80,
      quantityAvailable: 30,
    }),
  ]);

  await Promise.all([
    prisma.educationContent.upsert({
      where: { slug: "how-to-prepare-plastic-for-pickup" },
      update: {
        contentStatus: ContentStatus.PUBLISHED,
        publishedAt: new Date("2026-01-15T09:00:00.000Z"),
        deletedAt: null,
      },
      create: {
        authorId: demoAuthor.id,
        organizationId: ngo.id,
        title: "How to Prepare Plastic for Pickup",
        slug: "how-to-prepare-plastic-for-pickup",
        summary: "Simple steps to clean, sort, and pack plastic for recycling.",
        body: "Rinse containers, remove obvious food waste, flatten bottles, and keep plastic dry before pickup.",
        contentStatus: ContentStatus.PUBLISHED,
        publishedAt: new Date("2026-01-15T09:00:00.000Z"),
      },
    }),
    prisma.educationContent.upsert({
      where: { slug: "why-dry-cardboard-matters" },
      update: {
        contentStatus: ContentStatus.PUBLISHED,
        publishedAt: new Date("2026-02-02T09:00:00.000Z"),
        deletedAt: null,
      },
      create: {
        authorId: demoAuthor.id,
        organizationId: ngo.id,
        title: "Why Dry Cardboard Matters",
        slug: "why-dry-cardboard-matters",
        summary: "A short guide to protecting paper value before collection.",
        body: "Dry cardboard is easier to sort, transport, and recycle. Store it away from rain and food waste.",
        contentStatus: ContentStatus.PUBLISHED,
        publishedAt: new Date("2026-02-02T09:00:00.000Z"),
      },
    }),
  ]);

  await Promise.all([
    prisma.communityCampaign.upsert({
      where: { slug: "downtown-cleanup-workshop" },
      update: {
        status: CampaignStatus.OPEN,
        deletedAt: null,
      },
      create: {
        organizationId: ngo.id,
        title: "Downtown Cleanup Workshop",
        slug: "downtown-cleanup-workshop",
        description: "A practical workshop for sorting recyclables during community cleanup events.",
        startsAt: new Date("2026-08-08T03:30:00.000Z"),
        endsAt: new Date("2026-08-08T06:30:00.000Z"),
        locationName: "Community Hall",
        address: "Downtown Yangon",
        status: CampaignStatus.OPEN,
      },
    }),
    prisma.communityCampaign.upsert({
      where: { slug: "school-recycling-basics" },
      update: {
        status: CampaignStatus.OPEN,
        deletedAt: null,
      },
      create: {
        organizationId: ngo.id,
        title: "School Recycling Basics",
        slug: "school-recycling-basics",
        description: "An introductory workshop for students and teachers starting a recycling corner.",
        startsAt: new Date("2026-09-12T03:30:00.000Z"),
        endsAt: new Date("2026-09-12T05:30:00.000Z"),
        locationName: "Partner School",
        address: "Yangon",
        status: CampaignStatus.OPEN,
      },
    }),
  ]);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
