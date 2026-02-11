import { Logger, OnModuleDestroy } from '@nestjs/common';
import { Subject } from 'rxjs';

export class ShutdownService implements OnModuleDestroy {
  //inject app logger
  protected readonly logger = new Logger(ShutdownService.name);

  // Create an rxjs Subject that your application can subscribe to

  //shutdown
  private shutdownListener$: Subject<void> = new Subject();

  //  hooks to be executed - nestjs lifecycle hooks
  onModuleDestroy() {
    this.logger.warn('Shutting Down!!!');
  }

  onApplicationShutdown() {
    this.logger.warn('Shutdown Successfull!!!');
  }

  // Subscribe to the shutdown in your main.ts
  prepareToShutdown(shutdownFn: () => Promise<void>): void {
    this.shutdownListener$.subscribe(async () => await shutdownFn());
  }

  // Subscribe to the exception event
  handleExceptions(err: Error): void {
    this.shutdownListener$.subscribe(() => {
      this.logger.log('❌❌❌ ➡ ⬇⬇⬇ An Error occured -> UNCAUGHT EXCEPTION ERROR ⬇⬇⬇');

      const error = {
        name: err.name,
        message: err.message,
        stack: err.stack,
      };

      // log error to console
      this.logger.error(err.message, error.stack);

      // send exception error to log file
      this.logger.fatal(error);
    });

    //application termination event
    this.shutdown();
  }

  // Subscribe to the rejection event
  handleRejections(err: Error): void {
    this.logger.log('❌❌❌ ➡ ⬇⬇⬇ An Error occured -> UNHANDLED REJECTION ERROR ⬇⬇⬇');

    const error = {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };

    // log error to console
    this.logger.error(err.message, error.stack);

    // send error to log file
    this.logger.verbose(error);

    //application termination event
    this.shutdown();
  }

  // Emit the shutdown event
  shutdown() {
    this.shutdownListener$.next();
  }
}
