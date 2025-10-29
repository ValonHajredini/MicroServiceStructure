import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note } from './note.entity';
import { TenantScopedRepository, TenantContextService } from '@microservice/auth-utils';

@Injectable()
export class NotesService {
  private readonly notesRepository: TenantScopedRepository<Note>;

  constructor(
    @InjectRepository(Note)
    private readonly baseRepository: Repository<Note>,
    private readonly tenantContext: TenantContextService,
  ) {
    this.notesRepository = new TenantScopedRepository(tenantContext, baseRepository);
  }

  async create(title: string, content: string, user_id: string): Promise<Note> {
    const note = this.baseRepository.create({
      title,
      content,
      user_id,
    } as any);
    const result = await this.notesRepository.save(note);
    // Handle both single entity and array returns
    return Array.isArray(result) ? result[0] : result;
  }

  async findAll(): Promise<Note[]> {
    return this.notesRepository.find();
  }

  async findOne(id: string): Promise<Note | null> {
    return this.notesRepository.findOne({ where: { id } as any });
  }

  async update(id: string, title?: string, content?: string): Promise<Note | null> {
    await this.notesRepository.update({ id } as any, {
      ...(title && { title }),
      ...(content && { content }),
    } as any);
    return this.findOne(id);
  }

  async delete(id: string): Promise<void> {
    await this.notesRepository.delete({ id } as any);
  }

  async count(): Promise<number> {
    return this.notesRepository.count();
  }
}
