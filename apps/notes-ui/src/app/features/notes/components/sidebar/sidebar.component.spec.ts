import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { MessageService, ConfirmationService } from 'primeng/api';
import { SidebarComponent } from './sidebar.component';
import { FoldersService } from '../../services/folders.service';
import { Folder } from '../../models/folder.model';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  let foldersService: FoldersService;

  const mockFolders: Folder[] = [
    {
      id: '1',
      tenant_id: 'tenant-1',
      user_id: 'user-1',
      name: 'Work',
      parent_id: null,
      created_at: new Date()
    },
    {
      id: '2',
      tenant_id: 'tenant-1',
      user_id: 'user-1',
      name: 'Personal',
      parent_id: null,
      created_at: new Date()
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        ConfirmationService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    foldersService = TestBed.inject(FoldersService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load folders on init', () => {
    spyOn(foldersService, 'getFolders').and.returnValue(of(mockFolders));

    component.ngOnInit();

    expect(foldersService.getFolders).toHaveBeenCalled();
    expect(component.folderTree().length).toBe(1); // Root node
    expect(component.folderTree()[0].label).toBe('All Notes');
  });

  it('should emit folder selection', () => {
    spyOn(component.folderSelected, 'emit');

    const event = { node: { data: { id: '1' } } };
    component.onNodeSelect(event);

    expect(component.folderSelected.emit).toHaveBeenCalledWith('1');
  });

  it('should open new folder dialog', () => {
    component.onNewFolderClick();

    expect(component.folderDialogVisible()).toBe(true);
    expect(component.folderDialogMode()).toBe('create');
  });
});
