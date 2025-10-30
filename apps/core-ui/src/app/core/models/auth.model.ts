export interface RegisterRequest {
  companyName: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  roles: string[];
}

export interface AuthData {
  token: string;
  user: User;
}

export interface AuthResponse {
  success: boolean;
  data: AuthData;
  meta: {
    timestamp: string;
  };
}

export interface ErrorDetail {
  field?: string;
  constraint?: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ErrorDetail;
  };
}
