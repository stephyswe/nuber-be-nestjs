import { Field, InputType, ObjectType } from '@nestjs/graphql';

import {
  PaginationInput,
  PaginationOutput,
} from 'src/common/dtos/pagination.dto';
import { Restaurant } from '../models/restaurant.model';

@InputType()
export class SearchRestaurantInput extends PaginationInput {
  @Field(() => String)
  query: string;
}

@ObjectType()
export class SearchRestaurantOutput extends PaginationOutput {
  @Field(() => [Restaurant], { nullable: true })
  results?: Restaurant[];
}
