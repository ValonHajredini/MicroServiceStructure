export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  roles: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
