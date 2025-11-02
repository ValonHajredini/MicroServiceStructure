import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FilterDropdownComponent } from './filter-dropdown';
import { FilterService } from '../../services/filter';
import { FoldersService } from '../../services/folders.service';
import { of } from 'rxjs';

describe('FilterDropdownComponent', () => {
  let component: FilterDropdownComponent;
  let fixture: ComponentFixture<FilterDropdownComponent>;
  let filterServiceSpy: jasmine.SpyObj<FilterService>;
  let foldersServiceSpy: jasmine.SpyObj<FoldersService>;

  beforeEach(async () => {
    const filterSpy = jasmine.createSpyObj('FilterService', ['setFilter', 'clearFilter', 'getFilterLabel'], {
      activeFilter: of({ type: 'all' })
    });
    const foldersSpy = jasmine.createSpyObj('FoldersService', ['getFolders']);
    foldersSpy.getFolders.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [FilterDropdownComponent],
      providers: [
        { provide: FilterService, useValue: filterSpy },
        { provide: FoldersService, useValue: foldersSpy }
      ]
    }).compileComponents();

    filterServiceSpy = TestBed.inject(FilterService) as jasmine.SpyObj<FilterService>;
    foldersServiceSpy = TestBed.inject(FoldersService) as jasmine.SpyObj<FoldersService>;

    fixture = TestBed.createComponent(FilterDropdownComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load folders on init', () => {
    fixture.detectChanges();
    expect(foldersServiceSpy.getFolders).toHaveBeenCalled();
  });

  it('should apply filter', () => {
    const filter = { type: 'pinned' as const };
    component.applyFilter(filter);
    expect(filterServiceSpy.setFilter).toHaveBeenCalledWith(filter);
  });

  it('should clear filter', () => {
    component.clearFilter();
    expect(filterServiceSpy.clearFilter).toHaveBeenCalled();
  });
});
