import { join } from 'node:path';
import { DynamicModule, Module } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { YogaDriver, YogaDriverConfig } from '../../../src';
import { CatsModule } from './cats/cats.module';

@Module({})
export class AppModule {
  static forRoot(options?: YogaDriverConfig): DynamicModule {
    return {
      module: AppModule,
      providers: [HttpAdapterHost],
      imports: [
        CatsModule,
        GraphQLModule.forRoot<YogaDriverConfig>({
          ...options,
          driver: YogaDriver,
          typePaths: [join(__dirname, '**', '*.graphql')],
        }),
      ],
    };
  }
}
