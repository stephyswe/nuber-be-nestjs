import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { Prisma } from '@prisma/client';
import { CoreOutput } from '../../common/dtos/output.dto';
import { UserRole } from '../models/user.model';

@InputType()
export class CreateAccountInputType {
  @Field()
  email: string;

  @Field()
  password: string;

  @Field(() => UserRole)
  role: UserRole;
}

@InputType()
export class CreateAccountInput {
  @Field(() => CreateAccountInputType)
  data: Prisma.UserCreateInput;
}

@ObjectType()
export class CreateAccountOutput extends CoreOutput {}
