# User Interface Design Goals

## Overall UX Vision

Modern, clean, professional SaaS interface emphasizing speed and clarity. Users should feel like they're using a mature enterprise tool, not a consumer app. Focus on minimizing cognitive load through consistent navigation patterns across all services. Single-page application feel with instant transitions between views. Mobile-first responsive approach ensuring tablet and phone users have equally capable experiences.

## Key Interaction Paradigms

- **Service-based navigation:** Users explicitly navigate between service subdomains (notes.mydomain.com → kanban.mydomain.com) with persistent dashboard access
- **Context persistence:** JWT maintains user/tenant context seamlessly across services without re-login
- **Drag-and-drop workflows:** Kanban boards use natural drag-and-drop; Notes support dragging files for attachments
- **Autosave everything:** No explicit save buttons—content persists automatically (30-second intervals for notes)
- **Inline editing:** Click to edit patterns for titles, descriptions, board names rather than modal dialogs
- **Progressive disclosure:** Complex features hidden behind clean primary interfaces (e.g., advanced search, filters revealed on demand)

## Core Screens and Views

**Core Service (mydomain.com):**
- Public landing page (marketing/feature showcase)
- Registration/login forms
- Post-login dashboard showing service cards with status indicators
- Tenant settings page (service enablement, team management)
- User profile and account settings

**Notes Service (notes.mydomain.com):**
- Sidebar navigation with folder tree and pinned notes
- Notes list view with search bar and filters
- Full-screen note editor with rich text toolbar
- Attachment management panel within notes
- Search results view

**Kanban Service (kanban.mydomain.com):**
- Board list/switcher view
- Full Kanban board with columns and cards
- Task detail modal/sidebar with comments and assignments
- Board settings (columns, members, permissions)

## Accessibility: WCAG AA

Target WCAG 2.1 Level AA compliance for Phase 1. Key considerations:
- Keyboard navigation for all interactive elements (drag-and-drop has keyboard alternatives)
- Color contrast ratios meeting 4.5:1 for normal text, 3:1 for large text
- ARIA labels for screen readers, especially for dynamic content updates
- Focus indicators clearly visible on all focusable elements
- Form labels and error messages accessible
- Skip navigation links for keyboard users

## Branding

**Phase 1 approach:** Clean, professional, minimalist design without heavy branding constraints. Use PrimeNG's Lara Light theme as foundation with subtle customizations:
- Primary color palette: Blue spectrum (trust, professionalism) with green accents for success states
- Typography: System font stack for performance (SF Pro on macOS, Segoe UI on Windows, Roboto on Android)
- Iconography: PrimeNG icons with consistent styling
- White space: Generous padding/margins emphasizing content over chrome
- Future-ready: CSS variables structure allows easy theming later (dark mode in Phase 2, white-label in enterprise tier)

## Target Device and Platforms: Web Responsive

**Primary:** Desktop browsers (Chrome, Firefox, Safari, Edge 90+) with focus on 1280px+ viewports for productivity workflows

**Secondary:** Tablet landscape mode (iPad, Android tablets) with adaptive layouts stacking panels responsively

**Tertiary:** Mobile phones with simplified, stack-based layouts and touch-optimized controls (larger tap targets, bottom navigation)

No native mobile apps in Phase 1. Progressive Web App (PWA) considerations for Phase 2 (offline capability, home screen install).

---
