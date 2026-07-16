# Supabase Skill Guide

## Purpose

This guide explains how Supabase should be used in EcoLink. Supabase provides PostgreSQL hosting and file storage. Application data access should go through Prisma, while Supabase Storage manages uploaded media and private documents.

## Responsibilities

Supabase is responsible for:

- Managed PostgreSQL infrastructure.
- Storage buckets for files.
- Signed URLs for private files.
- Platform-level database and storage operations.

Prisma is responsible for normal application database access.

## Architecture Decisions

EcoLink uses Supabase PostgreSQL as the relational database and Supabase Storage for files. Do not bypass Prisma for ordinary application queries. Do not make sensitive storage buckets public.

## Conventions

Storage paths should be predictable and scoped:

```text
organizations/{organizationId}/verification/{documentId}
requests/{requestId}/photos/{photoId}
education/{contentId}/cover/{fileId}
rewards/{rewardOfferId}/images/{fileId}
```

Store metadata in PostgreSQL when the application needs ownership, audit, or lifecycle management.

## Best Practices

Validate file type and size before upload. Use private buckets for verification documents and sensitive request photos. Generate signed URLs only after server-side authorization.

Use public buckets only for assets intended to be public, such as published education images or approved reward images.

Keep service role keys server-only. Use least-privilege clients where possible.

## Examples

Private document flow:

```text
Admin or organization user requests upload permission.
Server verifies role and target organization.
File is uploaded to a controlled path.
Prisma stores document metadata.
Future reads use signed URLs after authorization.
```

## Things To Avoid

- Exposing service role keys.
- Public verification documents.
- Storage paths built from raw file names.
- Database writes through multiple access layers.
- Uploading unvalidated file types.
- Assuming file existence means the user may access it.
