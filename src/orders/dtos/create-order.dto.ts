import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';

import { CoreOutput } from '../../common/dtos/output.dto';
import { DishOption } from '../../restaurants/models/dish.model';

@InputType()
class CreateOrderItemInput {
  @Field(() => Int)
  dishId: number;

  @Field(() => [DishOption], { nullable: true })
  options?: DishOption[];
}

@InputType()
export class CreateOrderInput {
  @Field(() => Int)
  restaurantId: number;

  @Field(() => [CreateOrderItemInput])
  items: CreateOrderItemInput[];
}

@ObjectType()
export class CreateOrderOutput extends CoreOutput {}
