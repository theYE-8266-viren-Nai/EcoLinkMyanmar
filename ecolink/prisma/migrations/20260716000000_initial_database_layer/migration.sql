-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('RECYCLER', 'NGO', 'BUSINESS', 'GOVERNMENT', 'INTERNAL');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'OPERATOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'REMOVED');

-- CreateEnum
CREATE TYPE "RecyclingRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'MATCHED', 'SCHEDULED', 'COLLECTED', 'VERIFIED', 'COMPLETED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PickupStatus" AS ENUM ('SCHEDULED', 'EN_ROUTE', 'ARRIVED', 'COLLECTED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RewardEntryType" AS ENUM ('EARNED', 'SPENT', 'ADJUSTED', 'EXPIRED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "RewardSourceType" AS ENUM ('RECYCLING_REQUEST', 'REWARD_REDEMPTION', 'ADMIN_ADJUSTMENT', 'CAMPAIGN');

-- CreateEnum
CREATE TYPE "RewardOfferStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RewardRedemptionStatus" AS ENUM ('PENDING', 'FULFILLED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CampaignParticipationStatus" AS ENUM ('REGISTERED', 'WAITLISTED', 'CHECKED_IN', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ImpactScopeType" AS ENUM ('USER', 'ORGANIZATION', 'RECYCLING_REQUEST', 'COMMUNITY_CAMPAIGN');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('REQUEST_UPDATE', 'PICKUP_UPDATE', 'REWARD', 'CAMPAIGN', 'EDUCATION', 'SYSTEM');

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" UUID NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "defaultAddressId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" UUID NOT NULL,
    "userProfileId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "township" TEXT,
    "region" TEXT,
    "postalCode" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "instructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "organizationType" "OrganizationType" NOT NULL,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'DRAFT',
    "description" TEXT,
    "websiteUrl" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMembership" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userProfileId" UUID NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'INVITED',
    "invitedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationVerification" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "submittedById" UUID NOT NULL,
    "reviewedById" UUID,
    "status" "VerificationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "documentStoragePath" TEXT NOT NULL,
    "notes" TEXT,
    "reviewNotes" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialCategory" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "acceptedExamples" TEXT[],
    "rejectedExamples" TEXT[],
    "preparationInstructions" TEXT,
    "defaultRewardRate" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationAcceptedMaterial" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "materialCategoryId" UUID NOT NULL,
    "minimumWeightKg" DECIMAL(10,2),
    "maximumWeightKg" DECIMAL(10,2),
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationAcceptedMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecyclingRequest" (
    "id" UUID NOT NULL,
    "requesterId" UUID NOT NULL,
    "addressId" UUID NOT NULL,
    "status" "RecyclingRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "preferredPickupDate" TIMESTAMP(3),
    "preferredPickupWindow" TEXT,
    "notes" TEXT,
    "photoStoragePath" TEXT,
    "estimatedWeightKg" DECIMAL(10,2),
    "confirmedWeightKg" DECIMAL(10,2),
    "assignedOrganizationId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RecyclingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecyclingRequestItem" (
    "id" UUID NOT NULL,
    "recyclingRequestId" UUID NOT NULL,
    "materialCategoryId" UUID NOT NULL,
    "estimatedWeightKg" DECIMAL(10,2),
    "confirmedWeightKg" DECIMAL(10,2),
    "conditionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecyclingRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pickup" (
    "id" UUID NOT NULL,
    "recyclingRequestId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "assignedMemberId" UUID,
    "status" "PickupStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledStartAt" TIMESTAMP(3) NOT NULL,
    "scheduledEndAt" TIMESTAMP(3) NOT NULL,
    "arrivedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pickup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardOffer" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "pointsCost" INTEGER NOT NULL,
    "quantityAvailable" INTEGER,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "status" "RewardOfferStatus" NOT NULL DEFAULT 'DRAFT',
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RewardOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardLedgerEntry" (
    "id" UUID NOT NULL,
    "userProfileId" UUID NOT NULL,
    "entryType" "RewardEntryType" NOT NULL,
    "points" INTEGER NOT NULL,
    "sourceType" "RewardSourceType" NOT NULL,
    "sourceId" UUID,
    "recyclingRequestId" UUID,
    "rewardRedemptionId" UUID,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,

    CONSTRAINT "RewardLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardRedemption" (
    "id" UUID NOT NULL,
    "userProfileId" UUID NOT NULL,
    "rewardOfferId" UUID NOT NULL,
    "status" "RewardRedemptionStatus" NOT NULL DEFAULT 'PENDING',
    "pointsSpent" INTEGER NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fulfilledAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RewardRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationContent" (
    "id" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "organizationId" UUID,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "contentStatus" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EducationContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityCampaign" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "locationName" TEXT,
    "address" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CommunityCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignParticipant" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "userProfileId" UUID NOT NULL,
    "participationStatus" "CampaignParticipationStatus" NOT NULL DEFAULT 'REGISTERED',
    "checkedInAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImpactRecord" (
    "id" UUID NOT NULL,
    "scopeType" "ImpactScopeType" NOT NULL,
    "scopeId" UUID NOT NULL,
    "materialCategoryId" UUID,
    "weightKg" DECIMAL(12,2) NOT NULL,
    "co2eSavedKg" DECIMAL(12,2) NOT NULL,
    "landfillDivertedKg" DECIMAL(12,2) NOT NULL,
    "calculationVersion" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImpactRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "userProfileId" UUID NOT NULL,
    "notificationType" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "actionUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorUserId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_clerkUserId_key" ON "UserProfile"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_email_key" ON "UserProfile"("email");

-- CreateIndex
CREATE INDEX "UserProfile_email_idx" ON "UserProfile"("email");

-- CreateIndex
CREATE INDEX "UserProfile_deletedAt_idx" ON "UserProfile"("deletedAt");

-- CreateIndex
CREATE INDEX "Address_userProfileId_idx" ON "Address"("userProfileId");

-- CreateIndex
CREATE INDEX "Address_city_idx" ON "Address"("city");

-- CreateIndex
CREATE INDEX "Address_deletedAt_idx" ON "Address"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_organizationType_idx" ON "Organization"("organizationType");

-- CreateIndex
CREATE INDEX "Organization_verificationStatus_idx" ON "Organization"("verificationStatus");

-- CreateIndex
CREATE INDEX "Organization_deletedAt_idx" ON "Organization"("deletedAt");

-- CreateIndex
CREATE INDEX "OrganizationMembership_role_idx" ON "OrganizationMembership"("role");

-- CreateIndex
CREATE INDEX "OrganizationMembership_status_idx" ON "OrganizationMembership"("status");

-- CreateIndex
CREATE INDEX "OrganizationMembership_invitedById_idx" ON "OrganizationMembership"("invitedById");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMembership_organizationId_userProfileId_key" ON "OrganizationMembership"("organizationId", "userProfileId");

-- CreateIndex
CREATE INDEX "OrganizationVerification_organizationId_idx" ON "OrganizationVerification"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationVerification_status_idx" ON "OrganizationVerification"("status");

-- CreateIndex
CREATE INDEX "OrganizationVerification_submittedAt_idx" ON "OrganizationVerification"("submittedAt");

-- CreateIndex
CREATE INDEX "OrganizationVerification_reviewedById_idx" ON "OrganizationVerification"("reviewedById");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialCategory_slug_key" ON "MaterialCategory"("slug");

-- CreateIndex
CREATE INDEX "MaterialCategory_isActive_idx" ON "MaterialCategory"("isActive");

-- CreateIndex
CREATE INDEX "OrganizationAcceptedMaterial_isActive_idx" ON "OrganizationAcceptedMaterial"("isActive");

-- CreateIndex
CREATE INDEX "OrganizationAcceptedMaterial_materialCategoryId_idx" ON "OrganizationAcceptedMaterial"("materialCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationAcceptedMaterial_organizationId_materialCategor_key" ON "OrganizationAcceptedMaterial"("organizationId", "materialCategoryId");

-- CreateIndex
CREATE INDEX "RecyclingRequest_requesterId_idx" ON "RecyclingRequest"("requesterId");

-- CreateIndex
CREATE INDEX "RecyclingRequest_status_idx" ON "RecyclingRequest"("status");

-- CreateIndex
CREATE INDEX "RecyclingRequest_assignedOrganizationId_idx" ON "RecyclingRequest"("assignedOrganizationId");

-- CreateIndex
CREATE INDEX "RecyclingRequest_preferredPickupDate_idx" ON "RecyclingRequest"("preferredPickupDate");

-- CreateIndex
CREATE INDEX "RecyclingRequest_status_createdAt_idx" ON "RecyclingRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RecyclingRequest_deletedAt_idx" ON "RecyclingRequest"("deletedAt");

-- CreateIndex
CREATE INDEX "RecyclingRequestItem_recyclingRequestId_idx" ON "RecyclingRequestItem"("recyclingRequestId");

-- CreateIndex
CREATE INDEX "RecyclingRequestItem_materialCategoryId_idx" ON "RecyclingRequestItem"("materialCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Pickup_recyclingRequestId_key" ON "Pickup"("recyclingRequestId");

-- CreateIndex
CREATE INDEX "Pickup_organizationId_idx" ON "Pickup"("organizationId");

-- CreateIndex
CREATE INDEX "Pickup_assignedMemberId_idx" ON "Pickup"("assignedMemberId");

-- CreateIndex
CREATE INDEX "Pickup_status_idx" ON "Pickup"("status");

-- CreateIndex
CREATE INDEX "Pickup_organizationId_scheduledStartAt_idx" ON "Pickup"("organizationId", "scheduledStartAt");

-- CreateIndex
CREATE INDEX "RewardOffer_organizationId_idx" ON "RewardOffer"("organizationId");

-- CreateIndex
CREATE INDEX "RewardOffer_status_idx" ON "RewardOffer"("status");

-- CreateIndex
CREATE INDEX "RewardOffer_pointsCost_idx" ON "RewardOffer"("pointsCost");

-- CreateIndex
CREATE INDEX "RewardOffer_startsAt_idx" ON "RewardOffer"("startsAt");

-- CreateIndex
CREATE INDEX "RewardOffer_endsAt_idx" ON "RewardOffer"("endsAt");

-- CreateIndex
CREATE INDEX "RewardOffer_deletedAt_idx" ON "RewardOffer"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RewardLedgerEntry_rewardRedemptionId_key" ON "RewardLedgerEntry"("rewardRedemptionId");

-- CreateIndex
CREATE INDEX "RewardLedgerEntry_userProfileId_idx" ON "RewardLedgerEntry"("userProfileId");

-- CreateIndex
CREATE INDEX "RewardLedgerEntry_entryType_idx" ON "RewardLedgerEntry"("entryType");

-- CreateIndex
CREATE INDEX "RewardLedgerEntry_createdAt_idx" ON "RewardLedgerEntry"("createdAt");

-- CreateIndex
CREATE INDEX "RewardLedgerEntry_userProfileId_createdAt_idx" ON "RewardLedgerEntry"("userProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "RewardLedgerEntry_sourceType_sourceId_idx" ON "RewardLedgerEntry"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "RewardLedgerEntry_createdById_idx" ON "RewardLedgerEntry"("createdById");

-- CreateIndex
CREATE INDEX "RewardRedemption_userProfileId_idx" ON "RewardRedemption"("userProfileId");

-- CreateIndex
CREATE INDEX "RewardRedemption_rewardOfferId_idx" ON "RewardRedemption"("rewardOfferId");

-- CreateIndex
CREATE INDEX "RewardRedemption_status_idx" ON "RewardRedemption"("status");

-- CreateIndex
CREATE INDEX "RewardRedemption_redeemedAt_idx" ON "RewardRedemption"("redeemedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EducationContent_slug_key" ON "EducationContent"("slug");

-- CreateIndex
CREATE INDEX "EducationContent_organizationId_idx" ON "EducationContent"("organizationId");

-- CreateIndex
CREATE INDEX "EducationContent_contentStatus_idx" ON "EducationContent"("contentStatus");

-- CreateIndex
CREATE INDEX "EducationContent_publishedAt_idx" ON "EducationContent"("publishedAt");

-- CreateIndex
CREATE INDEX "EducationContent_deletedAt_idx" ON "EducationContent"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityCampaign_slug_key" ON "CommunityCampaign"("slug");

-- CreateIndex
CREATE INDEX "CommunityCampaign_organizationId_idx" ON "CommunityCampaign"("organizationId");

-- CreateIndex
CREATE INDEX "CommunityCampaign_status_idx" ON "CommunityCampaign"("status");

-- CreateIndex
CREATE INDEX "CommunityCampaign_startsAt_idx" ON "CommunityCampaign"("startsAt");

-- CreateIndex
CREATE INDEX "CommunityCampaign_deletedAt_idx" ON "CommunityCampaign"("deletedAt");

-- CreateIndex
CREATE INDEX "CampaignParticipant_participationStatus_idx" ON "CampaignParticipant"("participationStatus");

-- CreateIndex
CREATE INDEX "CampaignParticipant_userProfileId_idx" ON "CampaignParticipant"("userProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignParticipant_campaignId_userProfileId_key" ON "CampaignParticipant"("campaignId", "userProfileId");

-- CreateIndex
CREATE INDEX "ImpactRecord_scopeType_scopeId_idx" ON "ImpactRecord"("scopeType", "scopeId");

-- CreateIndex
CREATE INDEX "ImpactRecord_recordedAt_idx" ON "ImpactRecord"("recordedAt");

-- CreateIndex
CREATE INDEX "ImpactRecord_materialCategoryId_idx" ON "ImpactRecord"("materialCategoryId");

-- CreateIndex
CREATE INDEX "Notification_userProfileId_idx" ON "Notification"("userProfileId");

-- CreateIndex
CREATE INDEX "Notification_readAt_idx" ON "Notification"("readAt");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_defaultAddressId_fkey" FOREIGN KEY ("defaultAddressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationVerification" ADD CONSTRAINT "OrganizationVerification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationVerification" ADD CONSTRAINT "OrganizationVerification_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationVerification" ADD CONSTRAINT "OrganizationVerification_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationAcceptedMaterial" ADD CONSTRAINT "OrganizationAcceptedMaterial_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationAcceptedMaterial" ADD CONSTRAINT "OrganizationAcceptedMaterial_materialCategoryId_fkey" FOREIGN KEY ("materialCategoryId") REFERENCES "MaterialCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecyclingRequest" ADD CONSTRAINT "RecyclingRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecyclingRequest" ADD CONSTRAINT "RecyclingRequest_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecyclingRequest" ADD CONSTRAINT "RecyclingRequest_assignedOrganizationId_fkey" FOREIGN KEY ("assignedOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecyclingRequestItem" ADD CONSTRAINT "RecyclingRequestItem_recyclingRequestId_fkey" FOREIGN KEY ("recyclingRequestId") REFERENCES "RecyclingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecyclingRequestItem" ADD CONSTRAINT "RecyclingRequestItem_materialCategoryId_fkey" FOREIGN KEY ("materialCategoryId") REFERENCES "MaterialCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pickup" ADD CONSTRAINT "Pickup_recyclingRequestId_fkey" FOREIGN KEY ("recyclingRequestId") REFERENCES "RecyclingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pickup" ADD CONSTRAINT "Pickup_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pickup" ADD CONSTRAINT "Pickup_assignedMemberId_fkey" FOREIGN KEY ("assignedMemberId") REFERENCES "OrganizationMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardOffer" ADD CONSTRAINT "RewardOffer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardLedgerEntry" ADD CONSTRAINT "RewardLedgerEntry_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardLedgerEntry" ADD CONSTRAINT "RewardLedgerEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardLedgerEntry" ADD CONSTRAINT "RewardLedgerEntry_recyclingRequestId_fkey" FOREIGN KEY ("recyclingRequestId") REFERENCES "RecyclingRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardLedgerEntry" ADD CONSTRAINT "RewardLedgerEntry_rewardRedemptionId_fkey" FOREIGN KEY ("rewardRedemptionId") REFERENCES "RewardRedemption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_rewardOfferId_fkey" FOREIGN KEY ("rewardOfferId") REFERENCES "RewardOffer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationContent" ADD CONSTRAINT "EducationContent_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationContent" ADD CONSTRAINT "EducationContent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityCampaign" ADD CONSTRAINT "CommunityCampaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignParticipant" ADD CONSTRAINT "CampaignParticipant_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "CommunityCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignParticipant" ADD CONSTRAINT "CampaignParticipant_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpactRecord" ADD CONSTRAINT "ImpactRecord_materialCategoryId_fkey" FOREIGN KEY ("materialCategoryId") REFERENCES "MaterialCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
