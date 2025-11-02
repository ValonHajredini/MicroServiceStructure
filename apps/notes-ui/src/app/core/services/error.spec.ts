import { TestBed } from '@angular/core/testing';
import { ErrorService } from './error';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

describe('ErrorService', () => {
  let service: ErrorService;
  let messageServiceSpy: jasmine.SpyObj<MessageService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const msgSpy = jasmine.createSpyObj('MessageService', ['add']);
    const rtSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        ErrorService,
        { provide: MessageService, useValue: msgSpy },
        { provide: Router, useValue: rtSpy }
      ]
    });

    service = TestBed.inject(ErrorService);
    messageServiceSpy = TestBed.inject(MessageService) as jasmine.SpyObj<MessageService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should handle 404 error', () => {
    const error = new HttpErrorResponse({ status: 404 });
    service.handleError(error, 'Note');
    expect(messageServiceSpy.add).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'error',
      detail: 'Note not found. It may have been deleted.'
    }));
  });

  it('should show success message', () => {
    service.showSuccess('Test success');
    expect(messageServiceSpy.add).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'success',
      detail: 'Test success'
    }));
  });
});
