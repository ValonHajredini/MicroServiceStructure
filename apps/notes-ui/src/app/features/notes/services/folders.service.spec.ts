import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { FoldersService } from './folders.service';
import { Folder } from '../models/folder.model';

describe('FoldersService', () => {
  let service: FoldersService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(FoldersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get folders', () => {
    const mockFolders: Folder[] = [{
      id: '1',
      tenant_id: 'tenant-1',
      user_id: 'user-1',
      name: 'Test Folder',
      parent_id: null,
      created_at: new Date()
    }];

    service.getFolders().subscribe(folders => {
      expect(folders.length).toBe(1);
      expect(folders[0].name).toBe('Test Folder');
    });

    const req = httpMock.expectOne('http://localhost:3001/api/v1/folders');
    expect(req.request.method).toBe('GET');
    req.flush({ data: mockFolders, status: 'success', timestamp: new Date().toISOString() });
  });
});
