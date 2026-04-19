import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PaystackService } from './paystack.service';

@Global()
@Module({
  imports: [HttpModule],
  providers: [PaystackService],
  exports: [PaystackService],
})
export class PaystackModule {}
