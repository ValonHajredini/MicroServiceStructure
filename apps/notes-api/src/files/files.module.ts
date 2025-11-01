import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FilesClientService } from './files-client.service';

@Module({
  imports: [HttpModule],
  providers: [FilesClientService],
  exports: [FilesClientService],
})
export class FilesModule {}
