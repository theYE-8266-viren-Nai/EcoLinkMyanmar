# EcoLink Database Design

## Purpose

This document defines the planned data model for EcoLink. It is the source of truth for entities, relationships, naming, indexes, audit fields, soft deletion, migration strategy, and scalability considerations.

EcoLink's database must support a multi-role recycling platform: citizens request recycling support, organizations collect and process materials, NGOs run education and community campaigns, businesses participate in sustainability programs, and administrators verify trust-sensitive activity.

The planned database is Supabase PostgreSQL accessed through typed Supabase clients. Supabase Auth identities, Row Level Security policies, and explicit Data API grants are part of the database contract.

## Responsibilities

The database design must:

- Preserve accurate recycling, reward, and impact records.
- Support multi-role access and organization membership.
- Enable reliable status transitions for requests and pickups.
- Store audit trails for trust-sensitive actions.
- Keep personally identifiable information protected.
- Scale from early launch to multi-city operations.

## Naming Conventions

Application-facing database types should be generated from Supabase. Existing legacy Prisma-era tables use PascalCase and camelCase; new Supabase-native tables should prefer snake_case table and column names unless a migration must preserve an existing contract. Enum values use uppercase snake case.

Preferred fields:

- `id`: globally unique primary key.
- `createdAt`: record creation timestamp.
- `updatedAt`: last update timestamp.
- `deletedAt`: nullable soft-delete timestamp where needed.
- `createdById`: user who created the record when relevant.
- `updatedById`: user who last changed the record when relevant.

Avoid vague names such as `data`, `info`, `type`, or `status` without a domain prefix when ambiguity is likely.

## Core Models

### UserProfile

Purpose: Stores EcoLink-specific profile data for a Supabase-authenticated user.

Key fields:

- `id`
- `authUserId`
- `displayName`
- `email`
- `phone`
- `avatarUrl`
- `preferredLanguage`
- `defaultAddressId`
- `createdAt`
- `updatedAt`
- `deletedAt`

Relationships:

- Has many addresses.
- Has many recycling requests.
- Has many reward ledger entries.
- Has many organization memberships.
- Has many notifications.

Indexes:

- Unique index on `authUserId`.
- Unique or filtered index on `email` where appropriate.

Notes: Supabase Auth remains the authentication source. The app profile stores domain preferences and application relationships. Legacy `clerkUserId` may exist only during migration and must not be used for new authorization.

### Address

Purpose: Stores pickup and user address information.

Key fields:

- `id`
- `userProfileId`
- `label`
- `line1`
- `line2`
- `city`
- `township`
- `region`
- `postalCode`
- `latitude`
- `longitude`
- `instructions`
- `createdAt`
- `updatedAt`
- `deletedAt`

Relationships:

- Belongs to user profile.
- May be referenced by recycling requests.

Indexes:

- `userProfileId`
- Optional geospatial indexes in the future.

Notes: Store coordinates when reliable. Avoid making coordinates mandatory for MVP if local addresses are inconsistent.

### Organization

Purpose: Represents recycling organizations, NGOs, business partners, sponsors, and operational entities.

Key fields:

- `id`
- `name`
- `slug`
- `organizationType`
- `verificationStatus`
- `description`
- `websiteUrl`
- `contactEmail`
- `contactPhone`
- `logoUrl`
- `createdAt`
- `updatedAt`
- `deletedAt`

Relationships:

- Has many organization memberships.
- Has many verification records.
- Has many pickup assignments.
- Has many reward offers if partner/sponsor.
- Has many education posts if NGO/content partner.

Indexes:

- Unique index on `slug`.
- Index on `organizationType`.
- Index on `verificationStatus`.

### OrganizationMembership

Purpose: Connects users to organizations with roles.

Key fields:

- `id`
- `organizationId`
- `userProfileId`
- `role`
- `status`
- `invitedById`
- `createdAt`
- `updatedAt`

Relationships:

- Belongs to organization.
- Belongs to user profile.

Indexes:

- Unique index on `organizationId` and `userProfileId`.
- Index on `role`.
- Index on `status`.

Notes: Membership is the source for organization dashboard permissions. Supabase identity alone is not enough.

### OrganizationVerification

Purpose: Tracks verification submissions and decisions for organizations.

Key fields:

- `id`
- `organizationId`
- `submittedById`
- `reviewedById`
- `status`
- `documentStoragePath`
- `notes`
- `reviewNotes`
- `submittedAt`
- `reviewedAt`
- `createdAt`
- `updatedAt`

Relationships:

- Belongs to organization.
- Belongs to submitting user.
- May reference reviewing admin.

Indexes:

- `organizationId`
- `status`
- `submittedAt`

Notes: Verification documents should be private in Supabase Storage and accessed through signed URLs after authorization.

### MaterialCategory

Purpose: Defines recyclable material categories and handling guidance.

Key fields:

- `id`
- `name`
- `slug`
- `description`
- `acceptedExamples`
- `rejectedExamples`
- `preparationInstructions`
- `defaultRewardRate`
- `isActive`
- `createdAt`
- `updatedAt`

Relationships:

- Has many recycling request items.
- Has many organization accepted materials.

Indexes:

- Unique index on `slug`.
- Index on `isActive`.

### OrganizationAcceptedMaterial

Purpose: Defines which materials an organization accepts and under what conditions.

Key fields:

- `id`
- `organizationId`
- `materialCategoryId`
- `minimumWeightKg`
- `maximumWeightKg`
- `notes`
- `isActive`
- `createdAt`
- `updatedAt`

Relationships:

- Belongs to organization.
- Belongs to material category.

Indexes:

- Unique index on `organizationId` and `materialCategoryId`.
- Index on `isActive`.

### RecyclingRequest

Purpose: A citizen's request to recycle materials.

Key fields:

- `id`
- `requesterId`
- `addressId`
- `status`
- `preferredPickupDate`
- `preferredPickupWindow`
- `notes`
- `photoStoragePath`
- `estimatedWeightKg`
- `confirmedWeightKg`
- `assignedOrganizationId`
- `createdAt`
- `updatedAt`
- `cancelledAt`
- `completedAt`
- `deletedAt`

Relationships:

- Belongs to requester.
- Belongs to address.
- Has many recycling request items.
- May have one pickup.
- May produce reward ledger entries.

Indexes:

- `requesterId`
- `status`
- `assignedOrganizationId`
- `preferredPickupDate`
- Composite index on `status` and `createdAt`.

Notes: Status transitions must be controlled by domain logic. Do not allow arbitrary status changes from the client.

### RecyclingRequestItem

Purpose: A material line item within a recycling request.

Key fields:

- `id`
- `recyclingRequestId`
- `materialCategoryId`
- `estimatedWeightKg`
- `confirmedWeightKg`
- `conditionNotes`
- `createdAt`
- `updatedAt`

Relationships:

- Belongs to recycling request.
- Belongs to material category.

Indexes:

- `recyclingRequestId`
- `materialCategoryId`

### Pickup

Purpose: Tracks scheduled collection and operational fulfillment.

Key fields:

- `id`
- `recyclingRequestId`
- `organizationId`
- `assignedMemberId`
- `status`
- `scheduledStartAt`
- `scheduledEndAt`
- `arrivedAt`
- `completedAt`
- `failureReason`
- `createdAt`
- `updatedAt`

Relationships:

- Belongs to recycling request.
- Belongs to organization.
- May belong to assigned organization member.

Indexes:

- Unique index on `recyclingRequestId`.
- `organizationId`
- `assignedMemberId`
- `status`
- Composite index on `organizationId` and `scheduledStartAt`.

### PickupSchedule

Purpose: Defines the structured weekly Yangon collection window used to group accepted pickup requests.

Key fields:

- `id`
- `startsAt`
- `endsAt`
- `routeArea`
- `status`
- `dispatchedAt`

Notes: EcoLink currently creates the next Saturday 8:00–11:00 AM window in `Asia/Yangon`. Dispatch locks its route plans until an admin explicitly unlocks them.

### PickupRoutePlan

Purpose: Stores one private, closed collection loop for a pickup schedule.

Key fields:

- `scheduleId`
- `routeCode`
- `centerId`
- `status`
- `geometry`
- `distanceMeters`
- `durationSeconds`
- `planVersion`
- `generationError`

Relationships:

- Belongs to a pickup schedule and recycling center.
- Has many pickup route stops.

Notes: Route A begins and ends at Hlaing EcoPoint; Route B begins and ends at Tamwe Community Drop-off. Complete geometry and other members' stops are admin-only.

### PickupRouteStop

Purpose: Assigns an accepted pickup request to a numbered position and ETA on one collection loop.

Key fields:

- `routePlanId`
- `scheduleId`
- `pickupRequestId`
- `routeCode`
- `stopOrder`
- `estimatedArrivalAt`
- `latitude`
- `longitude`

Notes: Members may read only the stop associated with their own pickup request.

### RewardOffer

Purpose: Defines available rewards funded by EcoLink, partners, NGOs, or businesses.

Key fields:

- `id`
- `organizationId`
- `title`
- `description`
- `pointsCost`
- `quantityAvailable`
- `startsAt`
- `endsAt`
- `status`
- `imageUrl`
- `createdAt`
- `updatedAt`
- `deletedAt`

Relationships:

- May belong to sponsoring organization.
- Has many reward redemptions.

Indexes:

- `status`
- `pointsCost`
- `startsAt`
- `endsAt`

### RewardLedgerEntry

Purpose: Immutable record of points earned, spent, adjusted, or expired.

Key fields:

- `id`
- `userProfileId`
- `entryType`
- `points`
- `sourceType`
- `sourceId`
- `description`
- `createdAt`
- `createdById`

Relationships:

- Belongs to user profile.
- May reference recycling request, redemption, admin adjustment, or campaign.

Indexes:

- `userProfileId`
- `entryType`
- `createdAt`
- Composite index on `userProfileId` and `createdAt`.

Notes: Do not update ledger entries after creation except for rare administrative correction records. Balances should be calculated or materialized from ledger data.

### RewardRedemption

Purpose: Tracks a user's redemption of a reward offer.

Key fields:

- `id`
- `userProfileId`
- `rewardOfferId`
- `status`
- `pointsSpent`
- `redeemedAt`
- `fulfilledAt`
- `cancelledAt`
- `createdAt`
- `updatedAt`

Relationships:

- Belongs to user.
- Belongs to reward offer.
- Has reward ledger entry.

Indexes:

- `userProfileId`
- `rewardOfferId`
- `status`
- `redeemedAt`

### EducationContent

Purpose: Stores educational articles, guides, campaign pages, and learning content.

Key fields:

- `id`
- `authorId`
- `organizationId`
- `title`
- `slug`
- `summary`
- `body`
- `coverImageUrl`
- `contentStatus`
- `publishedAt`
- `createdAt`
- `updatedAt`
- `deletedAt`

Relationships:

- Belongs to author.
- May belong to organization.

Indexes:

- Unique index on `slug`.
- `contentStatus`
- `publishedAt`

### CommunityCampaign

Purpose: Represents recycling drives, cleanup events, school programs, and NGO campaigns.

Key fields:

- `id`
- `organizationId`
- `title`
- `slug`
- `description`
- `startsAt`
- `endsAt`
- `locationName`
- `address`
- `status`
- `createdAt`
- `updatedAt`
- `deletedAt`

Relationships:

- Belongs to organization.
- Has many campaign participants.

Indexes:

- Unique index on `slug`.
- `organizationId`
- `status`
- `startsAt`

### CampaignParticipant

Purpose: Tracks user participation in community campaigns.

Key fields:

- `id`
- `campaignId`
- `userProfileId`
- `participationStatus`
- `checkedInAt`
- `createdAt`
- `updatedAt`

Relationships:

- Belongs to campaign.
- Belongs to user profile.

Indexes:

- Unique index on `campaignId` and `userProfileId`.
- `participationStatus`

### ImpactRecord

Purpose: Stores calculated impact metrics for requests, organizations, campaigns, or users.

Key fields:

- `id`
- `scopeType`
- `scopeId`
- `materialCategoryId`
- `weightKg`
- `co2eSavedKg`
- `landfillDivertedKg`
- `calculationVersion`
- `recordedAt`
- `createdAt`

Relationships:

- May reference material category.

Indexes:

- Composite index on `scopeType` and `scopeId`.
- `recordedAt`
- `materialCategoryId`

Notes: Impact formulas change over time. Store `calculationVersion` to preserve historical meaning.

### Notification

Purpose: Stores user-facing notifications for request updates, rewards, education, and system messages.

Key fields:

- `id`
- `userProfileId`
- `notificationType`
- `title`
- `body`
- `readAt`
- `actionUrl`
- `createdAt`

Relationships:

- Belongs to user profile.

Indexes:

- `userProfileId`
- `readAt`
- `createdAt`

### AuditLog

Purpose: Records security-sensitive and trust-sensitive actions.

Key fields:

- `id`
- `actorUserId`
- `action`
- `entityType`
- `entityId`
- `metadata`
- `ipAddress`
- `userAgent`
- `createdAt`

Indexes:

- `actorUserId`
- Composite index on `entityType` and `entityId`.
- `action`
- `createdAt`

Notes: Metadata must not contain secrets. Use audit logs for admin actions, verification decisions, reward adjustments, and permission changes.

## Planned Enums

Recommended enums:

- `OrganizationType`: RECYCLER, NGO, BUSINESS, GOVERNMENT, INTERNAL
- `VerificationStatus`: DRAFT, SUBMITTED, APPROVED, REJECTED, SUSPENDED
- `MembershipRole`: OWNER, ADMIN, OPERATOR, VIEWER
- `MembershipStatus`: INVITED, ACTIVE, SUSPENDED, REMOVED
- `RecyclingRequestStatus`: DRAFT, SUBMITTED, MATCHED, SCHEDULED, COLLECTED, VERIFIED, COMPLETED, CANCELLED, REJECTED
- `PickupStatus`: SCHEDULED, EN_ROUTE, ARRIVED, COLLECTED, FAILED, CANCELLED
- `RewardEntryType`: EARNED, SPENT, ADJUSTED, EXPIRED, REFUNDED
- `RewardOfferStatus`: DRAFT, ACTIVE, PAUSED, EXPIRED, ARCHIVED
- `RewardRedemptionStatus`: PENDING, FULFILLED, CANCELLED, REFUNDED
- `ContentStatus`: DRAFT, REVIEW, PUBLISHED, ARCHIVED
- `CampaignStatus`: DRAFT, OPEN, IN_PROGRESS, COMPLETED, CANCELLED
- `NotificationType`: REQUEST_UPDATE, PICKUP_UPDATE, REWARD, CAMPAIGN, EDUCATION, SYSTEM

## Soft Delete Strategy

Use `deletedAt` for user-facing domain records that should disappear from normal views but remain for history or audit:

- UserProfile
- Address
- Organization
- RecyclingRequest
- RewardOffer
- EducationContent
- CommunityCampaign

Do not soft delete immutable ledger entries or audit logs. Use compensating records for corrections.

All read queries must intentionally filter soft-deleted records unless an admin/audit workflow requires them.

## Audit Fields

Use `createdAt` and `updatedAt` consistently. Add `createdById`, `updatedById`, `reviewedById`, or `cancelledById` where accountability matters.

For critical workflows, prefer explicit event timestamps:

- `submittedAt`
- `scheduledStartAt`
- `completedAt`
- `redeemedAt`
- `publishedAt`
- `reviewedAt`

## Migration Strategy

Use Supabase migrations. Every schema change must be reviewed for:

- Data preservation.
- Backward compatibility during deploy.
- Index cost.
- Nullability and default behavior.
- Required backfills.

For risky changes:

1. Add nullable fields first.
2. Deploy code that writes both old and new fields if needed.
3. Backfill data.
4. Make fields required in a later migration.
5. Remove old fields only after production data is verified.

Never edit a committed production migration. Add a new migration instead.

## Performance And Indexing

Index for real query patterns:

- User dashboards filter by user and recency.
- Organization dashboards filter by organization, status, and schedule.
- Admin dashboards filter by status and submission date.
- Public content filters by publication status and slug.
- Reward browsing filters by active status and points cost.

Avoid over-indexing early. Every index speeds reads but slows writes and increases storage.

## Scalability Considerations

Future needs may include:

- City or region partitioning for pickups.
- Geospatial matching between requests and organizations.
- Material price histories.
- External partner integrations.
- Reward balance materialization.
- Reporting snapshots for business customers.
- Data retention policies for private documents.

Design initial models so these can be added without replacing the core concepts.

## Things To Avoid

- Storing reward balances as the only source of truth.
- Mutating historical ledger entries.
- Mixing Supabase auth identity with EcoLink role membership.
- Making all organization users admins.
- Building status transitions as free-form strings.
- Storing private document URLs as public links.
- Putting secrets or raw tokens in audit metadata.
