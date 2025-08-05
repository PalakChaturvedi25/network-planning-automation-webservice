import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

/**
 * Global Logging Interceptor for NestJS
 *
 * This interceptor provides comprehensive logging for HTTP requests and responses
 * by capturing and logging the following details in a single log entry:
 * - Request method
 * - Request URL
 * - Request body
 * - Request headers
 * - Response data
 *
 * Benefits:
 * - Simplifies debugging by consolidating request and response information
 * - Eliminates need to search through multiple log files
 * - Provides a centralized view of API interactions
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(@Inject(Logger) private readonly logger: Logger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const timestamp = new Date().toISOString();

    return next.handle().pipe(
      tap((response) => {
        this.logger.log(
          JSON.stringify({
            timestamp: timestamp,
            request: {
              method: request.method,
              url: request.url,
              body: request.body,
              headers: request.headers,
            },
            response: response,
          }),
        );
      }),
    );
  }
}
// To implement the request/response interceptor for logging:
// 1. Create a new interceptor in NestJS
