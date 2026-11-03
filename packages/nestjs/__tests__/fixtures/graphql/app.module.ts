import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DynamicModule, Module } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { YogaDriver, YogaDriverConfig } from '../../../src';
import { CatsModule } from './cats/cats.module';

const dirname = fileURLToPath(new URL('.', import.meta.url));

@Module({})
export class AppModule {
  static forRoot(options?: YogaDriverConfig): DynamicModule {
    return {
      module: AppModule,
      providers: [HttpAdapterHost],
      imports: [
        HttpAdapterHost,
        CatsModule,
        GraphQLModule.forRoot<YogaDriverConfig>({
          ...options,
          driver: YogaDriver,
          typePaths: [join(dirname, '**', '*.graphql')],
        }),
      ],
    };
  }
}
