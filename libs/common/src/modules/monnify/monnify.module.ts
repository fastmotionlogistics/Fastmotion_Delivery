import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MonnifyService } from './monnify.service';

@Global()
@Module({
  imports: [HttpModule],
  providers: [MonnifyService],
  exports: [MonnifyService],
})
export class MonnifyModule {}
