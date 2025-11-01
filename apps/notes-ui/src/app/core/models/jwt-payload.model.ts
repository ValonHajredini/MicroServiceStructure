export interface JwtPayload {
  sub: string; // user_id
  email: string;
  tenantId: string;
  roles: string[];
  enabledServices: string[];
  iat: number;
  exp: number;
}
