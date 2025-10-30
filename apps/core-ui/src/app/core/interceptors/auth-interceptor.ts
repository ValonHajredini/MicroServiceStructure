import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Skip auth endpoints
  const skipUrls = ['/auth/login', '/auth/register'];
  if (skipUrls.some(url => req.url.includes(url))) {
    return next(req);
  }

  // Get token from localStorage
  const token = localStorage.getItem('auth_token');

  // Clone request and add Authorization header if token exists
  if (token) {
    const clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(clonedReq);
  }

  return next(req);
};
