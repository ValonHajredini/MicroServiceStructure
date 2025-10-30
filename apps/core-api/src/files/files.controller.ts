import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FilesService } from './files.service';
import { CreatePresignedUrlDto } from './dto/create-presigned-url.dto';
import {
  PresignedUrlResponseDto,
  FileDownloadResponseDto,
  FileDeleteResponseDto,
  FileConfirmResponseDto,
} from './dto/file-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: {
    userId: string;
    email: string;
    tenantId: string;
    roles: string[];
    enabledServices: string[];
  };
}

@Controller('api/v1/files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  /**
   * POST /api/v1/files/presigned-url
   * Generate presigned URL for file upload
   * Rate limit: 10 uploads per minute per user
   */
  @Post('presigned-url')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @HttpCode(HttpStatus.CREATED)
  async createPresignedUrl(
    @Body() dto: CreatePresignedUrlDto,
    @Request() req: RequestWithUser,
  ): Promise<{ success: boolean; data: PresignedUrlResponseDto }> {
    const data = await this.filesService.createPresignedUrl(
      dto,
      req.user.userId,
      req.user.tenantId,
    );

    return {
      success: true,
      data,
    };
  }

  /**
   * GET /api/v1/files/:id
   * Get file metadata and download URL
   */
  @Get(':id')
  async getFile(
    @Param('id') fileId: string,
    @Request() req: RequestWithUser,
  ): Promise<{ success: boolean; data: FileDownloadResponseDto }> {
    const data = await this.filesService.getFile(
      fileId,
      req.user.userId,
      req.user.tenantId,
    );

    return {
      success: true,
      data,
    };
  }

  /**
   * DELETE /api/v1/files/:id
   * Delete file (soft delete + remove from storage)
   */
  @Delete(':id')
  async deleteFile(
    @Param('id') fileId: string,
    @Request() req: RequestWithUser,
  ): Promise<{ success: boolean; data: FileDeleteResponseDto }> {
    const isAdmin = req.user.roles.includes('admin');
    const data = await this.filesService.deleteFile(
      fileId,
      req.user.userId,
      req.user.tenantId,
      isAdmin,
    );

    return {
      success: true,
      data,
    };
  }

  /**
   * PATCH /api/v1/files/:id/confirm
   * Confirm file upload (update status from pending to active)
   */
  @Patch(':id/confirm')
  async confirmUpload(
    @Param('id') fileId: string,
    @Request() req: RequestWithUser,
  ): Promise<{ success: boolean; data: FileConfirmResponseDto }> {
    const data = await this.filesService.confirmUpload(
      fileId,
      req.user.userId,
      req.user.tenantId,
    );

    return {
      success: true,
      data,
    };
  }
}
