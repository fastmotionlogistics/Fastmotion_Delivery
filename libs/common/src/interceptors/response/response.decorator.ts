import { applyDecorators, UseFilters, UseInterceptors } from '@nestjs/common';
import { ResponseFilter } from './response.filter';
import { ResponseDefaultInterceptor } from './response.default.interceptor';
import { IApplyDecorator } from '@libs/common/interfaces';
import { MongooseExceptionFilter } from '@libs/common/filters/mongoose.filter';
import { ResponsePagingInterceptor } from './response.paging.interceptor';
import { HttpValidationFilter } from '@libs/common/filters';

//default response decorator
export function Response(messagePath?: string): IApplyDecorator {
  return applyDecorators(
    UseInterceptors(ResponseDefaultInterceptor(messagePath)),
    UseFilters(ResponseFilter, MongooseExceptionFilter, HttpValidationFilter),
  );
}

export function ResponsePaging(messagePath: string): IApplyDecorator {
  return applyDecorators(UseInterceptors(ResponsePagingInterceptor(messagePath)), UseFilters(ResponseFilter));
}
