import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Note } from './entities/note.entity';
import { Attachment } from './entities/attachment.entity';
import { Folder } from '../folders/entities/folder.entity';
import { NotesRepository } from './repositories/notes.repository';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';
import { AttachmentsService } from './attachments.service';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Note, Attachment, Folder]),
    FilesModule,
  ],
  controllers: [NotesController],
  providers: [NotesService, NotesRepository, AttachmentsService],
  exports: [TypeOrmModule, NotesRepository, NotesService, AttachmentsService],
})
export class NotesModule {}
