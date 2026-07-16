import { activeRecord, paginate, prisma, type DbClient, type PaginationInput } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

export interface UpsertProfileInput {
  clerkUserId: string;
  email: string;
  displayName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  preferredLanguage?: string;
}

export class ProfileRepository {
  constructor(private readonly db: DbClient = prisma) {}

  findById(id: string) {
    return this.db.userProfile.findFirst({
      where: { id, ...activeRecord },
      include: {
        defaultAddress: true,
        organizationMemberships: {
          include: { organization: true },
        },
      },
    });
  }

  findByClerkUserId(clerkUserId: string) {
    return this.db.userProfile.findFirst({
      where: { clerkUserId, ...activeRecord },
    });
  }

  upsertFromClerk(input: UpsertProfileInput) {
    return this.db.userProfile.upsert({
      where: { clerkUserId: input.clerkUserId },
      create: {
        clerkUserId: input.clerkUserId,
        email: input.email,
        displayName: input.displayName,
        phone: input.phone,
        avatarUrl: input.avatarUrl,
        preferredLanguage: input.preferredLanguage ?? "en",
      },
      update: {
        email: input.email,
        displayName: input.displayName,
        phone: input.phone,
        avatarUrl: input.avatarUrl,
        preferredLanguage: input.preferredLanguage,
        deletedAt: null,
      },
    });
  }

  list(input: PaginationInput = {}) {
    const { skip, take } = paginate(input);

    return this.db.userProfile.findMany({
      where: activeRecord,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });
  }

  createAddress(data: Prisma.AddressUncheckedCreateInput) {
    return this.db.address.create({ data });
  }

  listAddresses(userProfileId: string) {
    return this.db.address.findMany({
      where: { userProfileId, ...activeRecord },
      orderBy: { createdAt: "desc" },
    });
  }

  softDelete(id: string) {
    return this.db.userProfile.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
