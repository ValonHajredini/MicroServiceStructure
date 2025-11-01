import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Folder } from './entities/folder.entity';
import { Note } from '../notes/entities/note.entity';
import { FoldersController } from './folders.controller';
import { FoldersService } from './folders.service';

@Module({
  imports: [TypeOrmModule.forFeature([Folder, Note])],
  controllers: [FoldersController],
  providers: [FoldersService],
  exports: [TypeOrmModule],
})
export class FoldersModule {}
