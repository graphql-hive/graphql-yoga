import { ParseIntPipe, UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, ResolveField, Resolver, Subscription } from '@nestjs/graphql';
import { createPubSub } from '../../../utils/pubsub';
import { CatsGuard } from './cats.guard';
import { CatsService } from './cats.service';
import { type Cat } from './interfaces/cat.interface';

const catCreated = createPubSub<{ catCreated: Cat }>();

@Resolver('Cat')
export class CatsResolvers {
  constructor(private readonly catsService: CatsService) {}

  @Query()
  @UseGuards(CatsGuard)
  getCats() {
    return this.catsService.findAll();
  }

  @ResolveField('color')
  getColor() {
    return 'black';
  }

  @ResolveField()
  weight() {
    return 5;
  }

  @Query('cat')
  findOneById(
    @Args('id', ParseIntPipe)
    id: number,
  ): Cat | undefined {
    return this.catsService.findOneById(id);
  }

  @Mutation('createCat')
  create(@Args() args: Cat): Cat {
    const createdCat = this.catsService.create(args);
    catCreated.pub({ catCreated: createdCat });
    return createdCat;
  }

  @Subscription('catCreated')
  catCreated() {
    return catCreated.sub();
  }

  @Subscription('greetings')
  async *greetings() {
    for (const hi of ['Hi', 'Bonjour', 'Hola', 'Ciao', 'Zdravo']) {
      yield { greetings: hi };
    }
  }

  @Subscription('filteredGreetings', {
    filter: (payload, variables) => {
      return payload.filteredGreetings
        .toLowerCase()
        .startsWith(variables.firstLetter.toLowerCase());
    },
  })
  async *filteredGreetings() {
    for (const hi of ['Hi', 'Bonjour', 'Hola', 'Ciao', 'Zdravo']) {
      yield { filteredGreetings: hi };
    }
  }
}
