export interface JwtPayload {
  sub: string; // userId
  email: string;
  tenantId: string;
  roles: string[];
  enabledServices: string[];
  iat?: number;
  exp?: number;
}
