# EcoLink Design System

## Purpose

This document defines the visual and interaction language for EcoLink. The design system should help citizens, recycling organizations, NGOs, and businesses feel that recycling is trustworthy, rewarding, and easy to understand. The experience should feel refined, calm, modern, and optimistic, inspired by the clarity of Apple, the operational precision of Linear, the trust-building polish of Stripe, and the restraint of Vercel, without copying any of them.

The visual identity must support EcoLink's tagline: "Turn Waste into Worth." The product should make waste feel measurable, manageable, and valuable, while avoiding guilt-heavy environmental messaging.

## Responsibilities

The design system is responsible for:

- Establishing consistent brand identity.
- Defining reusable visual tokens.
- Guiding layout and interaction decisions.
- Making accessibility a baseline.
- Providing states for loading, empty, error, and success moments.
- Keeping dashboards efficient and landing pages compelling.

All UI work should use these rules unless a documented product need requires an exception.

## Brand Identity

EcoLink should feel:

- Responsible, because users trust the platform with personal data, pickup details, and impact records.
- Fresh, because recycling should feel like progress rather than obligation.
- Practical, because organizations and businesses need efficient operational tools.
- Community-minded, because NGOs and local partners are central to the mission.

Use language that is direct and encouraging. Avoid exaggerated claims, fear-based climate language, or childish gamification. Rewards and impact should feel credible.

## Color Palette

The palette should balance environmental cues with civic trust and modern product clarity. Avoid a one-note green interface.

Core colors:

- `Eco Green`: primary action and positive impact.
- `River Teal`: secondary action, educational accents, storage and material flow.
- `Civic Blue`: trust, verification, business dashboards, links.
- `Carbon`: primary text and high-contrast surfaces.
- `Mist`: soft backgrounds and dividers.
- `Amber`: rewards, points, milestones, and warnings.
- `Rose`: destructive actions and critical errors.

Recommended token intent:

```text
background: clean page background
foreground: primary text
muted: secondary surfaces
muted-foreground: secondary text
primary: Eco Green
primary-foreground: text on primary
secondary: River Teal or Mist depending on context
accent: Amber for rewards and highlights
destructive: Rose
border: subtle neutral line
ring: focus outline
```

Use green for progress and primary calls to action, not for every component. Dashboards should use mostly neutral surfaces with color reserved for meaning.

## Typography

Typography should be clear and information-dense. Use a modern sans-serif with excellent legibility. The default should support Latin and Myanmar language expansion if localization is introduced.

Type hierarchy:

- Display: landing hero or major campaign pages only.
- H1: page title.
- H2: section title.
- H3: panel title.
- Body: default reading text.
- Small: metadata, helper text, captions.
- Label: form labels, filter labels, compact controls.

Avoid oversized type inside dashboards. Operational screens should scan quickly. Use `font-medium` for labels and important values, not heavy bold everywhere.

## Spacing System

Use a consistent spacing scale based on 4px increments. Common values:

- `4px`: tight icon and label spacing.
- `8px`: compact component spacing.
- `12px`: form field groups and card internals.
- `16px`: standard component padding.
- `24px`: section rhythm and dashboard gaps.
- `32px`: page-level separation.
- `48px+`: landing sections and editorial moments.

Dashboards should prioritize compact, readable density. Landing and educational pages can breathe more.

## Border Radius

EcoLink should feel precise, not overly soft. Recommended radii:

- `4px`: inputs, badges, table controls.
- `6px`: buttons and compact cards.
- `8px`: standard cards and panels.
- `12px`: modals and large media.
- Full radius only for avatars, circular icon buttons, and progress rings.

Do not use large pill shapes everywhere. Pills are appropriate for status badges and segmented controls.

## Shadow System

Use shadows sparingly. Most hierarchy should come from spacing, borders, background contrast, and typography.

Shadow levels:

- Subtle: hover elevation for cards or menus.
- Medium: dropdowns, popovers, modals.
- Strong: rare, only for focused overlays.

Avoid heavy shadows that make dashboards feel like marketing pages.

## Animations And Motion

Motion should communicate state and continuity. Use Framer Motion for meaningful transitions, not decoration.

Motion principles:

- Keep transitions fast: usually 120ms to 240ms.
- Use easing that feels natural and restrained.
- Animate opacity, transform, and height carefully.
- Avoid layout shifts during loading.
- Respect `prefers-reduced-motion`.

Good uses:

- Form validation feedback.
- Toast entrance and exit.
- Dashboard filter transitions.
- Reward milestone acknowledgement.
- Modal and drawer transitions.

Avoid:

- Constant looping animations in work surfaces.
- Motion that delays task completion.
- Confetti for routine events. Reserve celebration for meaningful milestones.

## Buttons

Button variants:

- Primary: main positive action, such as "Schedule pickup" or "Verify organization".
- Secondary: lower-priority actions.
- Outline: neutral actions in dense toolbars.
- Ghost: navigation and low-emphasis controls.
- Destructive: irreversible or risky actions.
- Icon: compact dashboard actions with accessible labels.

Buttons must have clear hover, active, disabled, loading, and focus states. Loading buttons should preserve width to avoid layout shift.

## Inputs And Forms

Forms should feel calm and trustworthy. Use visible labels, concise helper text, and field-level error messages. React Hook Form and Zod should power validation.

Input conventions:

- Labels above fields.
- Required fields indicated in text, not color alone.
- Error text directly under the field.
- Helper text for complex fields like material type or pickup instructions.
- Use select menus for known options.
- Use textareas for pickup notes, organization descriptions, and educational content summaries.

Avoid placeholder-only labels. Do not validate only after submit when inline validation can prevent mistakes.

## Cards

Cards represent bounded objects: recycling request, reward offer, organization profile, education article, impact summary, pickup slot, or notification.

Card conventions:

- Radius no larger than 8px unless the card contains large media.
- Clear title and status.
- Metadata grouped consistently.
- Actions placed predictably at the bottom or top-right.
- No nested cards.

Use full-width sections for page structure. Cards are for items, not for every layout container.

## Navigation

Navigation should reflect user role:

- Citizen: home, recycle, rewards, learn, community, profile.
- Organization: requests, pickups, inventory, impact, team, settings.
- NGO: campaigns, education, partners, impact, reports.
- Business: sustainability dashboard, pickup programs, rewards sponsorship, reporting.
- Admin: users, organizations, verification, content, rewards, audit logs.

Primary navigation should be stable. Role-specific navigation should not show inaccessible actions; however, server-side authorization remains mandatory.

## Dashboard Layout

Dashboards should be quiet, efficient, and scannable. Use a sidebar or top navigation depending on viewport. The main content area should use predictable sections:

- Page header with title, description, and primary action.
- Filter/search bar where needed.
- Summary metrics.
- Main table or list.
- Detail drawer or modal for secondary workflows.

Tables should support pagination, sorting, loading skeletons, empty states, and clear row actions.

## Landing Page Design

The landing page should immediately communicate EcoLink and the offer: turn recyclable waste into verified impact and rewards. It should show real product context, not abstract decoration.

Landing sections should include:

- Hero with EcoLink name or literal offer.
- How recycling flow works.
- Citizen benefits.
- Partner and organization value.
- Rewards and impact proof.
- Education/community trust signals.
- Call to action based on role.

Use authentic imagery or generated bitmap visuals that show recycling, community handoff, organized materials, or product UI. Avoid generic green gradients and abstract eco icons as the primary visual.

## Responsive Breakpoints

Design mobile-first, then enhance for larger screens.

Recommended breakpoints:

- Small: mobile phones.
- Medium: tablets and large phones.
- Large: laptops.
- Extra large: desktop dashboards.

Mobile dashboards should prioritize filters, cards, and concise summaries over wide tables. Desktop dashboards can use tables and split-pane layouts.

## Light And Dark Mode

Light mode should be the default. It is best for public civic and educational contexts. Dark mode should be supported for dashboards and users who prefer it.

Both modes must preserve color meaning and contrast. Do not simply invert colors. Reward amber, destructive rose, primary green, and verification blue need tuned dark-mode tokens.

## Accessibility

Minimum requirements:

- WCAG AA contrast for text and controls.
- Visible focus rings.
- Semantic landmarks and headings.
- Keyboard support for menus, modals, tabs, and forms.
- Screen-reader-friendly status changes.
- Reduced-motion support.
- Error messages linked to inputs.

Do not rely on icon-only meaning unless a label, tooltip, and accessible name are present.

## Iconography

Use lucide-style line icons through shadcn/ui conventions. Icons should be simple, consistent, and functional. Use icons for scanability in navigation, status, and compact buttons.

Recommended icon themes:

- Recycling and materials.
- Location and pickups.
- Rewards and wallet.
- Community and organizations.
- Education and guides.
- Verification and security.

Avoid mixing filled, outlined, and illustrative icons in the same interface region.

## Illustration And Imagery

Illustrations should be grounded, warm, and specific to EcoLink. Prefer images that show sorted materials, pickup preparation, partner handoff, community cleanup, or dashboard impact summaries.

Avoid generic planet-in-hands imagery, excessive leaf motifs, or purely decorative backgrounds.

## States

Empty states should explain what is missing and offer the next useful action. Example: no recycling requests should lead to scheduling a pickup or learning accepted materials.

Loading states should use skeletons for known layouts and spinners only for compact actions.

Error states should be calm, specific, and recoverable. Avoid blaming the user.

Success states should confirm the completed action and explain what happens next.

Toast messages should be short, actionable, and not replace persistent state. Critical errors should appear inline as well as in toast form where appropriate.

## Modals And Drawers

Use modals for focused decisions and confirmations. Use drawers for detail views that preserve dashboard context, such as viewing a recycling request from a table.

Modals must trap focus, support escape to close when safe, and return focus to the triggering element. Destructive confirmations must clearly name what will happen.

## Best Practices

- Let content and workflow guide layout.
- Use color for meaning.
- Keep dashboard UI dense but calm.
- Make every interactive state visible.
- Design mobile states intentionally.
- Include empty, loading, error, and success states from the start.

## Things To Avoid

- One-note green pages.
- Decorative cards inside cards.
- Placeholder-only forms.
- Motion that distracts from task completion.
- Overly playful gamification for serious workflows.
- Marketing-page composition in operational dashboards.
- Unlabeled icon buttons.
