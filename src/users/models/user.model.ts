import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { IsEmail } from 'class-validator';
import { CoreInputId } from '../../common/dtos/output.dto';
import { Order } from '../../orders/models/order.model';
import { Payment } from '../../payment/models/payment.model';
import { Restaurant } from '../../restaurants/models/restaurant.model';

export enum UserRole {
  Client = 'Client',
  Owner = 'Owner',
  Delivery = 'Delivery',
}

registerEnumType(UserRole, { name: 'UserRole' });

@ObjectType()
export class User extends CoreInputId {
  @Field(() => String)
  @IsEmail()
  email: string;

  @Field(() => String)
  password: string;

  @Field(() => UserRole)
  role: UserRole;

  @Field(() => Boolean)
  verified?: boolean;

  @Field(() => [Restaurant])
  restaurants: Restaurant[];

  @Field(() => [Order])
  orders: Order[];

  @Field(() => [Order])
  rides: Order[];

  @Field(() => [Payment])
  payments: Payment[];
}
