# PrimeNG Components Guide

## Installation Status ✅

- **PrimeNG**: v20.2.0 ✅ Installed
- **PrimeIcons**: v7.0.0 ✅ Installed
- **@primeuix/themes**: Latest ✅ Installed
- **Animations**: ✅ Configured

## Global Configuration

### styles.scss
```scss
@import 'primeicons/primeicons.css';
```

### app.config.ts
```typescript
provideAnimations() // Required for PrimeNG
```

## Available PrimeNG Components

### 1. Buttons & Actions
- **ButtonModule** - `<p-button>`
- Severities: primary, secondary, success, info, warn, danger
- Variants: outlined, text, rounded
- Icons supported via PrimeIcons

### 2. Form Components
- **InputTextModule** - `<input pInputText>`
- **FloatLabelModule** - `<p-floatlabel>`
- **PasswordModule** - `<p-password>`
- **CheckboxModule** - `<p-checkbox>`
- **RadioButtonModule** - `<p-radiobutton>`
- **SelectModule** - `<p-select>` (Dropdown)
- **TextareaModule** - `<textarea pTextarea>`

### 3. Data Display
- **CardModule** - `<p-card>`
- **TableModule** - `<p-table>`
- **PaginatorModule** - `<p-paginator>`
- **AvatarModule** - `<p-avatar>`
- **BadgeModule** - `badge` attribute
- **ChipModule** - `<p-chip>`
- **TagModule** - `<p-tag>`

### 4. Overlays & Panels
- **DrawerModule** - `<p-drawer>` (Sidebar)
- **DialogModule** - `<p-dialog>`
- **ConfirmDialogModule** - `<p-confirmdialog>`
- **MenuModule** - `<p-menu>`

### 5. Messages & Notifications
- **MessageModule** - `<p-message>`
- **ToastModule** - `<p-toast>`

### 6. Icons
- **PrimeIcons** - 200+ icons
- Usage: `<i class="pi pi-{icon-name}"></i>`
- Examples: pi-home, pi-user, pi-cog, pi-bell, pi-search

## Demo Page

Access the comprehensive demo at: **`/primeng-demo`**

The demo showcases:
- ✅ All button variants and severities
- ✅ Form inputs with float labels
- ✅ Dropdowns and selects
- ✅ Checkboxes and radio buttons
- ✅ Badges, chips, and tags
- ✅ Avatars with custom styling
- ✅ Data tables
- ✅ Drawers and dialogs
- ✅ Messages
- ✅ Menu components
- ✅ 200+ PrimeIcons

## Usage Example

```typescript
import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [ButtonModule, CardModule, InputTextModule],
  template: `
    <p-card header="Example">
      <input pInputText placeholder="Enter text" />
      <p-button label="Submit" icon="pi pi-check" />
    </p-card>
  `
})
export class ExampleComponent {}
```

## Sidebar Navigation

The PrimeNG Demo is accessible from the sidebar menu:
- Navigate to: **Settings → PrimeNG Demo**
- Or directly: `http://localhost:4200/primeng-demo`

## Components Used in Dashboard

Currently using:
- ✅ ButtonModule
- ✅ DrawerModule (mobile sidebar)
- ✅ AvatarModule
- ✅ MenuModule
- ✅ BadgeModule

## Documentation

Official PrimeNG Docs: https://primeng.org/

## Notes

- PrimeNG 20 uses a new architecture
- Themes are now handled via @primeuix/themes
- All components are standalone-compatible
- Animations are required for overlays (drawer, dialog, etc.)

