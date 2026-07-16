# Forms Skill Guide

## Purpose

This guide explains how forms should be built in EcoLink. Forms are central to recycling requests, pickup scheduling, organization verification, reward redemption, education publishing, and profile management.

## Responsibilities

Forms are responsible for:

- Collecting accurate user input.
- Explaining requirements clearly.
- Validating before and during submission.
- Showing accessible errors.
- Handling pending, success, and failure states.
- Submitting to secure Server Actions.

## Architecture Decisions

EcoLink uses React Hook Form for client form state and Zod for validation. Server Actions remain the secure mutation boundary. Client validation improves experience; server validation protects the system.

## Conventions

Every form field needs:

- Visible label.
- Clear input control.
- Helper text when requirements are not obvious.
- Field-level error.
- Accessible association between control and error.

Submit buttons should show pending state and prevent duplicate submission where appropriate.

## Best Practices

Use schemas that match the business workflow. A recycling request schema should validate material categories, estimated weight, address, and pickup preference. An organization verification schema should validate organization identity and required documents.

Preserve user input after recoverable server errors. Make errors specific and actionable.

Large forms should be split into sections, but avoid multi-step flows unless they reduce cognitive load.

## Examples

Good form flow:

```text
User fills request form.
Client validation catches missing material.
Server Action authenticates user.
Server validates input again.
Server creates request.
UI shows confirmation and next status.
```

## Things To Avoid

- Placeholder-only labels.
- Client-only validation.
- Duplicated validation rules.
- Generic "something went wrong" errors when a specific message is possible.
- Submit buttons without pending state.
- Forms that lose user input after a minor error.
