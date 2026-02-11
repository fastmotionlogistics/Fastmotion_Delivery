import { Module, Global } from '@nestjs/common';
import { MessageService } from './message.service';
// import { PROVIDERS } from '@core/common/constants';

/**
 * @global
 * @module MessageService -  messages for http responses and app constants
 * @exports MessageService
 */
@Global()
@Module({
  providers: [
    {
      provide: 'MessageService',

      useClass: MessageService,
    },
  ],
  exports: ['MessageService'],

  imports: [],
})
export class MessageModule {}
