import { Component, OnInit, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TreeModule } from 'primeng/tree';
import { ButtonModule } from 'primeng/button';
import { TreeNode, MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ContextMenuModule } from 'primeng/contextmenu';
import { MenuItem } from 'primeng/api';
import { FoldersService } from '../../services/folders.service';
import { Folder } from '../../models/folder.model';
import { FolderDialog } from '../folder-dialog/folder-dialog';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, TreeModule, ButtonModule, ConfirmDialogModule, ContextMenuModule, FolderDialog],
  providers: [ConfirmationService],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  private foldersService = inject(FoldersService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  @Output() folderSelected = new EventEmitter<string | null>();

  folderTree = signal<TreeNode[]>([]);
  loading = signal(true);
  selectedFolder = signal<TreeNode | null>(null);
  isVisible = signal(true);

  // Folder dialog state
  folderDialogVisible = signal(false);
  folderDialogMode = signal<'create' | 'rename'>('create');
  selectedFolderForEdit = signal<Folder | null>(null);
  allFolders = signal<Folder[]>([]);

  // Context menu
  contextMenuItems = signal<MenuItem[]>([]);
  selectedNodeForContext = signal<TreeNode | null>(null);

  ngOnInit(): void {
    this.loadFolders();
    this.setupContextMenu();
  }

  setupContextMenu(): void {
    this.contextMenuItems.set([
      {
        label: 'Rename',
        icon: 'pi pi-pencil',
        command: () => this.renameFolder()
      },
      {
        label: 'Delete',
        icon: 'pi pi-trash',
        command: () => this.deleteFolder()
      }
    ]);
  }

  loadFolders(): void {
    this.loading.set(true);
    this.foldersService.getFolders().subscribe({
      next: (folders) => {
        this.allFolders.set(folders);
        const treeNodes = this.buildTree(folders);
        const rootNode: TreeNode = {
          label: 'All Notes',
          data: { id: null },
          icon: 'pi pi-folder',
          expanded: true,
          children: treeNodes
        };
        this.folderTree.set([rootNode]);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
      }
    });
  }

  buildTree(folders: Folder[]): TreeNode[] {
    const folderMap = new Map<string, TreeNode>();
    const rootFolders: TreeNode[] = [];

    // Create nodes for all folders
    folders.forEach(folder => {
      const node: TreeNode = {
        label: folder.name,
        data: folder,
        icon: 'pi pi-folder',
        children: []
      };
      folderMap.set(folder.id, node);
    });

    // Build hierarchy
    folders.forEach(folder => {
      const node = folderMap.get(folder.id)!;
      if (folder.parent_id && folderMap.has(folder.parent_id)) {
        const parentNode = folderMap.get(folder.parent_id)!;
        if (!parentNode.children) {
          parentNode.children = [];
        }
        parentNode.children.push(node);
      } else {
        rootFolders.push(node);
      }
    });

    return rootFolders;
  }

  onNodeSelect(event: any): void {
    const folderId = event.node.data?.id || null;
    this.folderSelected.emit(folderId);
  }

  onNewFolderClick(): void {
    this.folderDialogMode.set('create');
    this.selectedFolderForEdit.set(null);
    this.folderDialogVisible.set(true);
  }

  onNodeContextMenu(event: any): void {
    // Don't show context menu for "All Notes" root node
    if (!event.node.data?.id) {
      return;
    }
    this.selectedNodeForContext.set(event.node);
  }

  renameFolder(): void {
    const node = this.selectedNodeForContext();
    if (!node || !node.data?.id) return;

    this.folderDialogMode.set('rename');
    this.selectedFolderForEdit.set(node.data as Folder);
    this.folderDialogVisible.set(true);
  }

  deleteFolder(): void {
    const node = this.selectedNodeForContext();
    if (!node || !node.data?.id) return;

    const folder = node.data as Folder;

    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${folder.name}"?`,
      header: 'Delete Folder',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.foldersService.deleteFolder(folder.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Folder deleted successfully',
              life: 3000
            });
            this.loadFolders();
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to delete folder',
              life: 3000
            });
          }
        });
      }
    });
  }

  onFolderDialogClosed(): void {
    this.folderDialogVisible.set(false);
  }

  onFolderSaved(folder: Folder): void {
    this.loadFolders();
  }

  toggleSidebar(): void {
    this.isVisible.set(!this.isVisible());
  }
}
