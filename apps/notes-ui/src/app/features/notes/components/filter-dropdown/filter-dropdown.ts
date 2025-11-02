import { Component, OnInit, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FilterService, FilterOption } from '../../services/filter';
import { FoldersService } from '../../services/folders.service';
import { Folder } from '../../models/folder.model';
import { MenuModule } from 'primeng/menu';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-filter-dropdown',
  imports: [CommonModule, MenuModule, ButtonModule, BadgeModule],
  templateUrl: './filter-dropdown.html',
  styleUrls: ['./filter-dropdown.scss']
})
export class FilterDropdownComponent implements OnInit {
  private filterService = inject(FilterService);
  private foldersService = inject(FoldersService);

  menuItems: MenuItem[] = [];
  folders: Folder[] = [];
  activeFilter: FilterOption = { type: 'all' };

  @Output() filterChanged = new EventEmitter<FilterOption>();

  ngOnInit() {
    this.filterService.activeFilter.subscribe(filter => {
      this.activeFilter = filter;
    });

    this.loadFolders();
  }

  private loadFolders() {
    this.foldersService.getFolders().subscribe({
      next: (folders) => {
        this.folders = folders;
        this.buildMenuItems();
      },
      error: (error) => {
        console.error('Failed to load folders:', error);
        this.buildMenuItems();
      }
    });
  }

  private buildMenuItems() {
    this.menuItems = [
      {
        label: 'All Notes',
        icon: 'pi pi-list',
        command: () => this.applyFilter({ type: 'all' })
      },
      {
        label: 'Pinned Only',
        icon: 'pi pi-star',
        command: () => this.applyFilter({ type: 'pinned' })
      },
      {
        label: 'Recent (7 days)',
        icon: 'pi pi-clock',
        command: () => this.applyFilter({ type: 'recent' })
      }
    ];

    if (this.folders.length > 0) {
      this.menuItems.push({ separator: true });
      this.menuItems.push({
        label: 'By Folder',
        icon: 'pi pi-folder',
        items: this.folders.map(folder => ({
          label: folder.name,
          icon: 'pi pi-folder-open',
          command: () => this.applyFilter({
            type: 'folder',
            folderId: folder.id,
            folderName: folder.name
          })
        }))
      });
    }
  }

  applyFilter(filter: FilterOption) {
    this.filterService.setFilter(filter);
    this.filterChanged.emit(filter);
  }

  clearFilter() {
    this.filterService.clearFilter();
    this.filterChanged.emit({ type: 'all' });
  }

  get hasActiveFilter(): boolean {
    return this.activeFilter.type !== 'all';
  }

  get filterLabel(): string {
    return this.filterService.getFilterLabel(this.activeFilter);
  }
}
