import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { StorageService } from './storage.service';
import { FilesValidator } from './files.validator';
import { FileMetadata } from './entities/file-metadata.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FileMetadata]), ConfigModule],
  controllers: [FilesController],
  providers: [FilesService, StorageService, FilesValidator],
  exports: [FilesService],
})
export class FilesModule {}
