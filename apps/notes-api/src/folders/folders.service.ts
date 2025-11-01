import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Folder } from './entities/folder.entity';
import { Note } from '../notes/entities/note.entity';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

export interface FolderTree extends Folder {
  children: FolderTree[];
}

@Injectable()
export class FoldersService {
  constructor(
    @InjectRepository(Folder)
    private foldersRepo: Repository<Folder>,
    @InjectRepository(Note)
    private notesRepo: Repository<Note>,
  ) {}

  /**
   * Create a new folder
   * AC: 1, 5 - Validate single-level nesting
   */
  async create(
    createFolderDto: CreateFolderDto,
    user: JwtPayload,
  ): Promise<Folder> {
    const { parent_id, ...folderData } = createFolderDto;

    // Validate single-level nesting if parent_id provided
    if (parent_id) {
      await this.validateSingleLevelNesting(parent_id, user.tenantId);
    }

    // Create folder with auto-assigned tenant_id and user_id
    const folder = this.foldersRepo.create({
      ...folderData,
      parent_id,
      tenant_id: user.tenantId,
      user_id: user.sub,
    });

    return this.foldersRepo.save(folder);
  }

  /**
   * Get folder tree structure
   * AC: 2 - Return hierarchical structure ordered by name
   */
  async findAll(user: JwtPayload): Promise<FolderTree[]> {
    const folders = await this.foldersRepo.find({
      where: { tenant_id: user.tenantId },
      order: { name: 'ASC' },
    });

    return this.buildFolderTree(folders);
  }

  /**
   * Find single folder by id
   * Helper method for update and delete
   */
  async findOne(id: string, tenantId: string): Promise<Folder> {
    const folder = await this.foldersRepo.findOne({
      where: {
        id,
        tenant_id: tenantId,
      },
    });

    if (!folder) {
      throw new NotFoundException(
        `Folder ${id} not found or does not belong to your tenant`,
      );
    }

    return folder;
  }

  /**
   * Update folder
   * AC: 3, 5, 7 - Update name or parent with authorization and nesting validation
   */
  async update(
    id: string,
    updateFolderDto: UpdateFolderDto,
    user: JwtPayload,
  ): Promise<Folder> {
    const folder = await this.findOne(id, user.tenantId);

    // Authorization check: folder owner or admin
    if (!this.canModifyFolder(folder, user)) {
      throw new ForbiddenException('You can only modify your own folders');
    }

    const { parent_id, ...updateData } = updateFolderDto;

    // Validate folder move if parent_id is being updated
    if (parent_id !== undefined) {
      if (parent_id === null) {
        // Moving to root
        updateData['parent_id'] = null;
      } else {
        // Prevent circular reference
        if (parent_id === id) {
          throw new BadRequestException(
            'Folder cannot be its own parent',
          );
        }

        // Validate folder can be moved (no children if moving under parent)
        await this.validateMoveFolder(id, parent_id, user.tenantId);

        updateData['parent_id'] = parent_id;
      }
    }

    // Update only provided fields
    Object.assign(folder, updateData);

    return this.foldersRepo.save(folder);
  }

  /**
   * Delete folder
   * AC: 4, 7 - Delete folder, cascade children, move notes to root
   */
  async delete(id: string, user: JwtPayload): Promise<void> {
    const folder = await this.findOne(id, user.tenantId);

    // Authorization check: folder owner or admin
    if (!this.canModifyFolder(folder, user)) {
      throw new ForbiddenException('You can only delete your own folders');
    }

    // Move notes in folder to root (folder_id = NULL)
    await this.notesRepo.update(
      { folder_id: id, tenant_id: user.tenantId },
      { folder_id: null },
    );

    // Find and delete child folders
    const childFolders = await this.foldersRepo.find({
      where: { parent_id: id, tenant_id: user.tenantId },
    });

    for (const child of childFolders) {
      // Move notes in child folder to root
      await this.notesRepo.update(
        { folder_id: child.id, tenant_id: user.tenantId },
        { folder_id: null },
      );

      // Delete child folder
      await this.foldersRepo.delete(child.id);
    }

    // Delete parent folder
    await this.foldersRepo.delete(id);
  }

  /**
   * Build folder tree structure
   * AC: 2 - Create hierarchical structure with children
   */
  private buildFolderTree(folders: Folder[]): FolderTree[] {
    const folderMap = new Map<string, FolderTree>();
    const rootFolders: FolderTree[] = [];

    // Create map of all folders with empty children arrays
    folders.forEach((folder) => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });

    // Build tree structure
    folders.forEach((folder) => {
      const folderNode = folderMap.get(folder.id);

      if (folder.parent_id) {
        const parent = folderMap.get(folder.parent_id);
        if (parent) {
          parent.children.push(folderNode);
        } else {
          // Orphaned folder - add to root
          rootFolders.push(folderNode);
        }
      } else {
        rootFolders.push(folderNode);
      }
    });

    return rootFolders;
  }

  /**
   * Validate single-level nesting
   * AC: 5 - Ensure parent folder has no parent (single-level only)
   */
  private async validateSingleLevelNesting(
    parentId: string,
    tenantId: string,
  ): Promise<void> {
    const parent = await this.foldersRepo.findOne({
      where: { id: parentId, tenant_id: tenantId },
    });

    if (!parent) {
      throw new NotFoundException('Parent folder not found');
    }

    if (parent.parent_id) {
      throw new BadRequestException(
        'Folders can only be nested one level deep. The selected parent folder already has a parent.',
      );
    }
  }

  /**
   * Validate folder move
   * AC: 5 - Prevent multi-level nesting when moving folders
   */
  private async validateMoveFolder(
    folderId: string,
    newParentId: string,
    tenantId: string,
  ): Promise<void> {
    // Check if folder has children
    const childCount = await this.foldersRepo.count({
      where: { parent_id: folderId, tenant_id: tenantId },
    });

    if (childCount > 0) {
      throw new BadRequestException(
        'Cannot move folder with children under another folder. Only single-level nesting is allowed.',
      );
    }

    // Validate new parent has no parent
    await this.validateSingleLevelNesting(newParentId, tenantId);
  }

  /**
   * Authorization helper
   * AC: 7 - Check if user can modify folder (owner or admin)
   */
  canModifyFolder(folder: Folder, user: JwtPayload): boolean {
    return folder.user_id === user.sub || user.roles.includes('admin');
  }
}
