---
name: design-guide
description: Complete PrimeNG UI design system for Angular applications. Use when building any UI with PrimeNG components including setup, theming with design tokens, component usage (buttons, inputs, dropdowns, cards, forms, etc.), and applying modern design principles. Covers installation, theme presets (Aura, Material, Lara, Nora), custom theme creation, dark mode, and component-specific styling.
---

# PrimeNG Design Guide

Complete guide for building modern, professional UIs with PrimeNG in Angular.

## Installation & Setup

### Install PrimeNG

```bash
npm install primeng @primeuix/themes
```

### Configure in app.config.ts

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Aura
      }
    })
  ]
};
```

### Import Components

Each component must be imported individually:

```typescript
import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';

@Component({
  selector: 'app-demo',
  imports: [ButtonModule, InputTextModule, DropdownModule],
  standalone: true
})
export class DemoComponent {}
```

## Theming Architecture

PrimeNG uses a three-tier design token system: **Primitive** → **Semantic** → **Component**

### Built-in Presets

- **Aura** - PrimeTek's modern vision (recommended)
- **Material** - Google Material Design v2
- **Lara** - Bootstrap-inspired
- **Nora** - Enterprise applications

```typescript
import Aura from '@primeuix/themes/aura';
import Material from '@primeuix/themes/material';
import Lara from '@primeuix/themes/lara';
import Nora from '@primeuix/themes/nora';
```

### Theme Options

```typescript
providePrimeNG({
  theme: {
    preset: Aura,
    options: {
      prefix: 'p',                    // CSS variable prefix: --p-primary-color
      darkModeSelector: 'system',     // 'system' | '.my-app-dark' | false
      cssLayer: false                 // Wrap styles in CSS layer
    }
  }
})
```

### Dark Mode Configuration

**System-based (default):**
```typescript
options: {
  darkModeSelector: 'system'  // Uses @media (prefers-color-scheme: dark)
}
```

**Toggle-based:**
```typescript
options: {
  darkModeSelector: '.my-app-dark'
}
```

```typescript
// Toggle dark mode
toggleDarkMode() {
  document.querySelector('html').classList.toggle('my-app-dark');
}
```

**Always dark:**
```html
<html class="my-app-dark">
```

**Disable dark mode:**
```typescript
options: {
  darkModeSelector: false  // or 'none'
}
```

## Custom Theming

### Create Custom Preset

```typescript
// mypreset.ts
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

const MyPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{indigo.50}',
      100: '{indigo.100}',
      200: '{indigo.200}',
      300: '{indigo.300}',
      400: '{indigo.400}',
      500: '{indigo.500}',
      600: '{indigo.600}',
      700: '{indigo.700}',
      800: '{indigo.800}',
      900: '{indigo.900}',
      950: '{indigo.950}'
    }
  }
});

export default MyPreset;
```

```typescript
// app.config.ts
import MyPreset from './mypreset';

providePrimeNG({
  theme: {
    preset: MyPreset
  }
})
```

### Color Scheme Customization

**CRITICAL:** When customizing tokens that use `colorScheme` in the original preset, you MUST define your override under `colorScheme`, not directly:

```typescript
// ❌ WRONG - Will be ignored
const MyPreset = definePreset(Aura, {
  semantic: {
    highlight: {
      background: '{primary.50}',
      color: '{primary.700}'
    }
  }
});

// ✅ CORRECT
const MyPreset = definePreset(Aura, {
  semantic: {
    colorScheme: {
      light: {
        highlight: {
          background: '{primary.50}',
          color: '{primary.700}'
        }
      },
      dark: {
        highlight: {
          background: '{primary.200}',
          color: '{primary.900}'
        }
      }
    }
  }
});
```

### Surface Colors (Light/Dark Tones)

```typescript
const MyPreset = definePreset(Aura, {
  semantic: {
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
          50: '{zinc.50}',
          100: '{zinc.100}',
          // ... through 950
        }
      },
      dark: {
        surface: {
          0: '#ffffff',
          50: '{slate.50}',
          100: '{slate.100}',
          // ... through 950
        }
      }
    }
  }
});
```

### Form Field Styling

```typescript
const MyPreset = definePreset(Aura, {
  semantic: {
    colorScheme: {
      light: {
        formField: {
          hoverBorderColor: '{primary.color}'
        }
      },
      dark: {
        formField: {
          hoverBorderColor: '{primary.color}'
        }
      }
    }
  }
});
```

### Focus Ring

```typescript
const MyPreset = definePreset(Aura, {
  semantic: {
    focusRing: {
      width: '2px',
      style: 'solid',
      color: '{primary.color}',
      offset: '1px'
    }
  }
});
```

### Component-Specific Tokens

```typescript
const MyPreset = definePreset(Aura, {
  components: {
    card: {
      colorScheme: {
        light: {
          root: {
            background: '{surface.0}',
            color: '{surface.700}'
          }
        },
        dark: {
          root: {
            background: '{surface.900}',
            color: '{surface.0}'
          }
        }
      }
    }
  }
});
```

### Scoped Component Styling

Style individual component instances without affecting global styles:

```typescript
import { Component } from '@angular/core';
import { ToggleSwitch } from 'primeng/toggleswitch';

@Component({
  template: `
    <p-toggleswitch [(ngModel)]="checked1" />
    <p-toggleswitch [(ngModel)]="checked2" [dt]="amberSwitch" />
  `,
  imports: [ToggleSwitch]
})
export class AppComponent {
  amberSwitch = {
    colorScheme: {
      light: {
        root: {
          checkedBackground: '{amber.500}',
          checkedHoverBackground: '{amber.600}'
        }
      }
    }
  };
}
```

### Dynamic Theme Updates

```typescript
import { usePreset, updatePreset, updatePrimaryPalette } from '@primeuix/themes';

// Replace entire preset
changeTheme() {
  usePreset(DarkPreset);
}

// Merge tokens into current preset
updateColors() {
  updatePreset({
    semantic: {
      primary: { 500: '{indigo.500}' }
    }
  });
}

// Update primary palette (shorthand)
changePrimary() {
  updatePrimaryPalette({
    50: '{indigo.50}',
    // ... through 950
  });
}
```

## Core Components

### Button

```html
<!-- Primary button -->
<p-button label="Check" />

<!-- With icon -->
<p-button label="Search" icon="pi pi-search" />

<!-- Icon only -->
<p-button icon="pi pi-check" />

<!-- Secondary -->
<p-button label="Cancel" severity="secondary" />

<!-- Sizes -->
<p-button label="Small" size="small" />
<p-button label="Large" size="large" />

<!-- Text button -->
<p-button label="Link" [text]="true" />

<!-- Disabled -->
<p-button label="Submit" [disabled]="true" />
```

**Severity options:** `primary`, `secondary`, `success`, `info`, `warn`, `danger`, `contrast`

### InputText

```html
<!-- Basic -->
<input pInputText type="text" />

<!-- With ngModel -->
<input pInputText [(ngModel)]="value" />

<!-- Placeholder -->
<input pInputText placeholder="Username" />

<!-- Disabled -->
<input pInputText [disabled]="true" />

<!-- Invalid state -->
<input pInputText class="ng-invalid ng-dirty" />

<!-- Fluid (full width) -->
<input pInputText [fluid]="true" />
```

### Dropdown / Select

**Note:** PrimeNG v20 introduced `<p-select>` as replacement for `<p-dropdown>`. Both work identically.

```typescript
export class MyComponent {
  cities = [
    { name: 'New York', code: 'NY' },
    { name: 'London', code: 'LDN' },
    { name: 'Paris', code: 'PRS' }
  ];
  selectedCity: any;
}
```

```html
<!-- Basic dropdown -->
<p-dropdown 
  [options]="cities" 
  [(ngModel)]="selectedCity"
  optionLabel="name"
  placeholder="Select a City" />

<!-- Filter enabled -->
<p-dropdown 
  [options]="cities"
  [(ngModel)]="selectedCity"
  optionLabel="name"
  [filter]="true"
  filterBy="name"
  placeholder="Select a City" />

<!-- Show clear button -->
<p-dropdown 
  [options]="cities"
  [(ngModel)]="selectedCity"
  optionLabel="name"
  [showClear]="true" />

<!-- Custom option value -->
<p-dropdown 
  [options]="cities"
  [(ngModel)]="selectedCity"
  optionLabel="name"
  optionValue="code" />

<!-- With template -->
<p-dropdown [options]="countries" [(ngModel)]="selectedCountry" optionLabel="name">
  <ng-template let-country pTemplate="item">
    <div class="flex items-center gap-2">
      <img [src]="country.flag" style="width: 18px" />
      <div>{{ country.name }}</div>
    </div>
  </ng-template>
</p-dropdown>

<!-- Filled variant -->
<p-dropdown 
  [options]="cities"
  [(ngModel)]="selectedCity"
  variant="filled"
  optionLabel="name" />

<!-- Disabled -->
<p-dropdown 
  [options]="cities"
  [(ngModel)]="selectedCity"
  [disabled]="true" />

<!-- Editable (allows typing) -->
<p-dropdown 
  [options]="cities"
  [(ngModel)]="selectedCity"
  [editable]="true" />

<!-- Grouped options -->
<p-dropdown 
  [options]="groupedCities"
  [(ngModel)]="selectedCity"
  [group]="true">
  <ng-template let-group pTemplate="group">
    <span>{{ group.label }}</span>
  </ng-template>
</p-dropdown>
```

### MultiSelect

```html
<!-- Basic -->
<p-multiselect 
  [options]="cities"
  [(ngModel)]="selectedCities"
  optionLabel="name"
  placeholder="Select Cities" />

<!-- Max selected labels -->
<p-multiselect 
  [options]="cities"
  [(ngModel)]="selectedCities"
  optionLabel="name"
  [maxSelectedLabels]="3" />

<!-- Display as chips -->
<p-multiselect 
  [options]="cities"
  [(ngModel)]="selectedCities"
  display="chip"
  optionLabel="name" />

<!-- With filter -->
<p-multiselect 
  [options]="cities"
  [(ngModel)]="selectedCities"
  [filter]="true"
  optionLabel="name" />
```

### Card

```html
<p-card header="Simple Card">
  <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
</p-card>

<!-- With subheader -->
<p-card header="Title" subheader="Subtitle">
  Content here
</p-card>

<!-- Custom header/footer -->
<p-card>
  <ng-template pTemplate="header">
    <div class="flex items-center justify-between">
      <span>Custom Header</span>
      <p-button icon="pi pi-cog" [text]="true" />
    </div>
  </ng-template>
  
  <p>Card content</p>
  
  <ng-template pTemplate="footer">
    <p-button label="Save" />
    <p-button label="Cancel" severity="secondary" />
  </ng-template>
</p-card>
```

### FloatLabel (Floating Labels)

```html
<p-floatLabel>
  <input pInputText id="username" [(ngModel)]="value" />
  <label for="username">Username</label>
</p-floatLabel>

<p-floatLabel>
  <p-dropdown 
    [options]="cities"
    [(ngModel)]="selectedCity"
    inputId="city"
    optionLabel="name" />
  <label for="city">Select a City</label>
</p-floatLabel>
```

### Message / Toast

```html
<!-- Inline message -->
<p-message severity="success" text="Success Message" />
<p-message severity="info" text="Info Message" />
<p-message severity="warn" text="Warning Message" />
<p-message severity="error" text="Error Message" />

<!-- Simple variant -->
<p-message severity="error" text="Field is required" variant="simple" size="small" />
```

## Forms Integration

### Template-Driven Forms

```html
<form #exampleForm="ngForm" (ngSubmit)="onSubmit(exampleForm)">
  <div class="flex flex-col gap-1">
    <input 
      pInputText 
      #name="ngModel"
      [(ngModel)]="value"
      name="username"
      required
      [invalid]="name.invalid && (name.touched || exampleForm.submitted)" />
    
    @if (name.invalid && (name.touched || exampleForm.submitted)) {
      <p-message severity="error" size="small" variant="simple">
        Username is required
      </p-message>
    }
  </div>
  
  <button pButton type="submit">Submit</button>
</form>
```

### Reactive Forms

```typescript
import { FormBuilder, Validators } from '@angular/forms';

export class MyComponent {
  form = this.fb.group({
    username: ['', Validators.required],
    city: [null, Validators.required]
  });
  
  constructor(private fb: FormBuilder) {}
  
  onSubmit() {
    if (this.form.valid) {
      console.log(this.form.value);
    }
  }
  
  isInvalid(field: string) {
    const control = this.form.get(field);
    return control?.invalid && (control?.touched || control?.dirty);
  }
}
```

```html
<form [formGroup]="form" (ngSubmit)="onSubmit()">
  <div class="flex flex-col gap-1">
    <input 
      pInputText 
      formControlName="username"
      [invalid]="isInvalid('username')" />
    
    @if (isInvalid('username')) {
      <p-message severity="error" size="small" variant="simple">
        Username is required
      </p-message>
    }
  </div>
  
  <div class="flex flex-col gap-1">
    <p-dropdown 
      [options]="cities"
      formControlName="city"
      optionLabel="name"
      [invalid]="isInvalid('city')" />
    
    @if (isInvalid('city')) {
      <p-message severity="error" size="small" variant="simple">
        City is required
      </p-message>
    }
  </div>
  
  <button pButton severity="secondary" type="submit">Submit</button>
</form>
```

## Design Principles

### Spacing System (8px Grid)

Use these values: `8px`, `16px`, `24px`, `32px`, `48px`, `64px`

**PrimeFlex utility classes:**
- `p-2` = 8px padding
- `p-3` = 16px padding
- `p-4` = 24px padding
- `p-5` = 32px padding
- `p-6` = 48px padding
- `p-7` = 64px padding

**Gap utilities:**
- `gap-2`, `gap-3`, `gap-4`, etc.

### Component Spacing Guidelines

- **Card padding:** `24px` or `32px`
- **Form field gaps:** `16px` or `24px`
- **Section margins:** `48px` or `64px`
- **Button padding:** Built into PrimeNG (do not override)

### Color Usage

**Use design tokens, not hardcoded colors:**

```css
/* ❌ WRONG */
.my-element {
  background: #10b981;
}

/* ✅ CORRECT */
.my-element {
  background: var(--p-primary-color);
}
```

**Common tokens:**
- `--p-primary-color`
- `--p-surface-0` through `--p-surface-950`
- `--p-text-color`
- `--p-text-muted-color`
- `--p-border-color`

### Typography

PrimeNG components inherit typography from your application. Set at document level:

```css
/* Global styles */
html {
  font-size: 14px;  /* Base for rem units */
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

body {
  font-size: 1rem;  /* 14px */
  line-height: 1.5;
}

h1 { font-size: 2rem; font-weight: 700; }
h2 { font-size: 1.5rem; font-weight: 600; }
h3 { font-size: 1.25rem; font-weight: 600; }
```

### Rem-Based Scaling

PrimeNG uses `rem` units. Change component scale globally:

```css
html {
  font-size: 16px;  /* Default: all components scale to 16px base */
}

html {
  font-size: 14px;  /* All components become ~12% smaller */
}

html {
  font-size: 18px;  /* All components become ~12% larger */
}
```

### Interactive States

PrimeNG handles all interactive states automatically via design tokens:
- **Hover:** Managed by `--p-*-hover-background`, `--p-*-hover-color`
- **Focus:** Managed by focus ring tokens
- **Active:** Managed by `--p-*-active-*` tokens
- **Disabled:** Use `[disabled]` property

Do not override hover/focus states unless absolutely necessary.

### Variant Property

Many components support `variant` property:

```html
<!-- Outlined (default) -->
<input pInputText variant="outlined" />

<!-- Filled (raised background) -->
<input pInputText variant="filled" />
```

### Fluid Property

Make components full-width:

```html
<input pInputText [fluid]="true" />
<p-dropdown [options]="items" [fluid]="true" />
<p-button label="Full Width" [fluid]="true" />
```

## Advanced Customization

### CSS Layer Configuration

Enable CSS layers for easier customization:

```typescript
providePrimeNG({
  theme: {
    preset: Aura,
    options: {
      cssLayer: {
        name: 'primeng',
        order: 'reset, primeng, app-styles'
      }
    }
  }
})
```

```css
/* Order */
@layer reset, primeng, app-styles;

/* Reset CSS won't conflict with PrimeNG */
@layer reset {
  button, input {
    /* Reset styles */
  }
}

/* Your app styles have higher specificity */
@layer app-styles {
  .my-button {
    /* Custom styles */
  }
}
```

### Accessing Design Tokens Programmatically

```typescript
import { $dt } from '@primeuix/themes';

const primaryColor = $dt('primary.color');
// Returns: { name, variable, value }

const duration = $dt('transition.duration');
// Returns: { name: '--transition-duration', variable: 'var(--p-transition-duration)', value: '0.2s' }
```

### Generating Color Palettes

```typescript
import { palette } from '@primeuix/themes';

// From hex
const shades = palette('#10b981');  // Returns 50-950 shades

// Copy existing token
const blues = palette('{blue}');
```

## Common Patterns

### Form with Validation

```html
<form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
  <!-- Username -->
  <div class="flex flex-col gap-1">
    <label for="username">Username</label>
    <input 
      pInputText 
      id="username"
      formControlName="username"
      [invalid]="isInvalid('username')"
      [fluid]="true" />
    @if (isInvalid('username')) {
      <p-message severity="error" size="small" variant="simple">
        Username is required
      </p-message>
    }
  </div>
  
  <!-- City -->
  <div class="flex flex-col gap-1">
    <label for="city">City</label>
    <p-dropdown 
      [options]="cities"
      formControlName="city"
      inputId="city"
      optionLabel="name"
      placeholder="Select a City"
      [invalid]="isInvalid('city')"
      [fluid]="true" />
    @if (isInvalid('city')) {
      <p-message severity="error" size="small" variant="simple">
        City is required
      </p-message>
    }
  </div>
  
  <div class="flex gap-2">
    <p-button label="Submit" type="submit" />
    <p-button label="Cancel" severity="secondary" type="button" />
  </div>
</form>
```

### Card with Actions

```html
<p-card>
  <ng-template pTemplate="header">
    <div class="flex items-center justify-between px-6 pt-6">
      <h3 class="text-xl font-semibold">Card Title</h3>
      <p-button icon="pi pi-cog" [text]="true" severity="secondary" />
    </div>
  </ng-template>
  
  <div class="px-6 pb-4">
    <p>Card content goes here.</p>
  </div>
  
  <ng-template pTemplate="footer">
    <div class="flex justify-end gap-2 px-6 pb-6">
      <p-button label="Cancel" severity="secondary" />
      <p-button label="Save" />
    </div>
  </ng-template>
</p-card>
```

## Anti-Patterns to Avoid

1. **Hardcoding colors** - Use design tokens instead
2. **Overriding component CSS** - Use design tokens and `[dt]` property
3. **Inconsistent spacing** - Stick to 8px grid
4. **Not using [fluid]** - Results in fixed-width components
5. **Forgetting [invalid]** - Users need visual feedback
6. **Mixing component libraries** - Stick to PrimeNG for consistency
7. **Ignoring color schemes** - Define tokens for both light and dark
8. **Deep CSS overrides** - Use token system instead

## Quick Checklist

Before finalizing any PrimeNG UI:

- [ ] Theme preset configured in `app.config.ts`
- [ ] Dark mode strategy chosen (system/toggle/always)
- [ ] All components imported individually
- [ ] Forms use proper validation display
- [ ] `[invalid]` property used for error states
- [ ] `[fluid]` used for full-width components
- [ ] Custom colors use design tokens, not hex
- [ ] Spacing follows 8px grid
- [ ] Typography inherits from document level
- [ ] Component tokens customized (not CSS overrides)
