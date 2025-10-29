import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { NotesService } from './notes.service';
import { Note } from './note.entity';

@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  async create(
    @Body() createNoteDto: { title: string; content: string; user_id: string },
  ): Promise<Note> {
    return this.notesService.create(
      createNoteDto.title,
      createNoteDto.content,
      createNoteDto.user_id,
    );
  }

  @Get()
  async findAll(): Promise<Note[]> {
    return this.notesService.findAll();
  }

  @Get('/count')
  async count(): Promise<{ count: number }> {
    const count = await this.notesService.count();
    return { count };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Note | null> {
    return this.notesService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateNoteDto: { title?: string; content?: string },
  ): Promise<Note | null> {
    return this.notesService.update(id, updateNoteDto.title, updateNoteDto.content);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    await this.notesService.delete(id);
    return { message: 'Note deleted successfully' };
  }
}
