import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FoldersService } from './folders.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

/**
 * FoldersController
 * Handles folder organization for notes with JWT authentication
 *
 * All endpoints:
 * - Require JWT authentication (JwtAuthGuard)
 * - Auto-scope to tenant from JWT
 * - Support single-level nesting only
 */
@Controller('api/v1/folders')
@UseGuards(JwtAuthGuard)
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  /**
   * POST /api/v1/folders
   * Create a new folder
   * AC: 1, 5
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createFolderDto: CreateFolderDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.foldersService.create(createFolderDto, user);
  }

  /**
   * GET /api/v1/folders
   * Get folder tree structure (tenant-scoped)
   * AC: 2
   */
  @Get()
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.foldersService.findAll(user);
  }

  /**
   * PATCH /api/v1/folders/:id
   * Update folder name or parent (owner or admin only)
   * AC: 3, 5, 7
   */
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateFolderDto: UpdateFolderDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.foldersService.update(id, updateFolderDto, user);
  }

  /**
   * DELETE /api/v1/folders/:id
   * Delete folder, move notes to root (owner or admin only)
   * AC: 4, 7
   */
  @Delete(':id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.foldersService.delete(id, user);

    return {
      message: 'Folder deleted successfully',
    };
  }
}
