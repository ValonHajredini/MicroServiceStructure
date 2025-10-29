export interface JwtPayload {
  sub: string;          // User ID
  email: string;
  tenantId: string;
  roles: string[];      // ['admin', 'user']
  enabledServices: string[];  // ['notes', 'kanban']
  iat: number;
  exp: number;
}
