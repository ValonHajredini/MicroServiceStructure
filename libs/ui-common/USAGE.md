# UI Common Library - Usage Guide

## Overview

The `@microservice/ui-common` library provides shared Angular components and utilities for all microservice applications in the monorepo.

## Installation

The library is automatically linked via npm workspaces. To use it in your Angular app:

1. Add the dependency to your `package.json`:
```json
{
  "dependencies": {
    "@microservice/ui-common": "*"
  }
}
```

2. Add TypeScript path mapping to your `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@microservice/ui-common": ["../../dist/libs/ui-common"]
    }
  }
}
```

3. Run `npm install` from the monorepo root

## Building the Library

Before using the library, it must be built:

```bash
# Build only the library
cd libs/ui-common
npm run build

# Or build everything with Turbo (recommended)
npx turbo build
```

## Available Components

### LoadingComponent

A simple loading spinner with an optional message.

**Selector**: `ui-loading`

**Usage:**
```typescript
import { Component } from '@angular/core';
import { LoadingComponent } from '@microservice/ui-common';

@Component({
  standalone: true,
  imports: [LoadingComponent],
  template: `
    <ui-loading [message]="'Loading data...'"></ui-loading>
  `
})
export class MyComponent {}
```

**Inputs:**
- `message` (string, default: 'Loading...'): Message to display below the spinner

**Example:**
```html
<!-- Basic usage -->
<ui-loading></ui-loading>

<!-- With custom message -->
<ui-loading message="Fetching notes..."></ui-loading>

<!-- Conditional loading -->
<ui-loading *ngIf="isLoading" message="Please wait..."></ui-loading>
```

---

### EmptyStateComponent

A customizable empty state component with icon, title, message, and optional action button.

**Selector**: `ui-empty-state`

**Usage:**
```typescript
import { Component } from '@angular/core';
import { EmptyStateComponent } from '@microservice/ui-common';

@Component({
  standalone: true,
  imports: [EmptyStateComponent],
  template: `
    <ui-empty-state
      icon="pi-inbox"
      title="No items found"
      message="Get started by creating your first item"
      actionLabel="Create Item"
      (action)="onCreate()">
    </ui-empty-state>
  `
})
export class MyComponent {
  onCreate() {
    console.log('Create action triggered');
  }
}
```

**Inputs:**
- `icon` (string, default: 'pi-file'): PrimeIcons icon class (without 'pi' prefix)
- `title` (string, default: 'No items'): Main heading text
- `message` (string, default: ''): Optional description text
- `actionLabel` (string, default: ''): Button label (button hidden if empty)

**Outputs:**
- `action` (EventEmitter<void>): Emitted when action button is clicked

**Examples:**
```html
<!-- Basic usage -->
<ui-empty-state
  icon="pi-folder"
  title="No folders yet"
  message="Create a folder to organize your notes">
</ui-empty-state>

<!-- With action button -->
<ui-empty-state
  icon="pi-inbox"
  title="Inbox is empty"
  message="You're all caught up!"
  actionLabel="Refresh"
  (action)="onRefresh()">
</ui-empty-state>

<!-- Search results empty state -->
<ui-empty-state
  icon="pi-search"
  title="No results found"
  [message]="'No items match \"' + searchTerm + '\"'"
  actionLabel="Clear Search"
  (action)="clearSearch()">
</ui-empty-state>
```

---

## Best Practices

1. **Always build the library first**: Run `npm run build` in the library or use `npx turbo build` to ensure the latest changes are available

2. **Import only what you need**: Import specific components rather than the entire library to optimize bundle size

3. **Use consistent selectors**: The library uses the `ui-` prefix for all component selectors to avoid conflicts

4. **Check PrimeIcons**: Both components rely on PrimeIcons. Ensure your app has PrimeIcons installed and imported in styles

## Development Workflow

### Making Changes to the Library

1. Make your changes in `libs/ui-common/src/`
2. Rebuild the library: `cd libs/ui-common && npm run build`
3. Test in your Angular app (dev server will hot-reload with the changes)

### Adding New Components

1. Create component in `libs/ui-common/src/lib/components/`
2. Export it in `src/public-api.ts`
3. Rebuild the library
4. Update this documentation

## Troubleshooting

### "Cannot find module '@microservice/ui-common'"

- Ensure the library is built: `cd libs/ui-common && npm run build`
- Verify TypeScript path mapping in `tsconfig.json`
- Run `npm install` from the monorepo root

### Changes not reflecting in app

- Rebuild the library after making changes
- Clear Angular cache: `rm -rf apps/your-app/.angular`
- Restart the dev server

### PrimeNG components not rendering

- Ensure PrimeNG and PrimeIcons are installed in your app
- Check that your app imports PrimeNG themes in `styles.scss`

## Future Additions

Planned components for the library:

- **Authentication Module** (AuthService, AuthGuard, HTTP Interceptor)
- **Layout Components** (BaseLayout, Sidebar, Topbar, UserMenu)
- **Form Components** (FormField, ValidationMessage)
- **Services** (ErrorService, ToastService, KeyboardService)
- **Utilities** (JWT helpers, date formatters, string utilities)

---

For questions or issues, please contact the platform team or create an issue in the repository.
