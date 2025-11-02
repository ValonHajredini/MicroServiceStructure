# @microservice/ui-common

Shared Angular UI components and utilities for microservice applications.

## Overview

This library provides reusable Angular components, services, and utilities that are shared across multiple microservice applications in the monorepo.

## Features

- **Components**: Reusable UI components built with PrimeNG
  - LoadingComponent
  - EmptyStateComponent
  - (More components will be added)

- **Services**: Common services for error handling, authentication, etc.
  - (Coming soon)

- **Utilities**: Helper functions and utilities
  - (Coming soon)

## Installation

This library is part of the monorepo and is automatically linked via npm workspaces.

```bash
# Build the library
cd libs/ui-common
npm run build
```

## Usage

Import components in your Angular application:

```typescript
import { LoadingComponent, EmptyStateComponent } from '@microservice/ui-common';

@Component({
  standalone: true,
  imports: [LoadingComponent, EmptyStateComponent],
  // ...
})
export class YourComponent {}
```

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm run test
```

## Dependencies

This library requires:
- Angular 20.3.0+
- PrimeNG 20.3.0+
- PrimeIcons 7.0.0+
- RxJS 7.8.0+

## License

Private - Part of MicroServiceStructure monorepo
