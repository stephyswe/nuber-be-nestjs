import { Injectable } from '@nestjs/common';
import { Order as PrismaOrders } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { User, UserRole } from '../users/models/user.model';
import { CreateOrderOutput } from './dtos/create-order.dto';
import { FindOrderInput } from './dtos/find-order.dto';
import { FindManyOrdersInput } from './dtos/find-orders.dto';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  async findManyOrders(user: User, { status }: FindManyOrdersInput) {
    try {
      let orders: PrismaOrders[];
      if (user.role === UserRole.Client) {
        orders = await this.prisma.order.findMany({
          where: {
            customerId: user.id,
            ...(status && { status }),
          },
        });
      } else if (user.role === UserRole.Delivery) {
        orders = await this.prisma.order.findMany({
          where: {
            driverId: user.id,
            ...(status && { status }),
          },
        });
      } else if (user.role === UserRole.Owner) {
        const restaurants = await this.prisma.restaurant.findMany({
          where: {
            userId: user.id,
          },
          include: { orders: true },
        });
        orders = restaurants.map((restaurant) => restaurant.orders).flat(1);
        if (status) {
          orders = orders.filter((order) => order.status === status);
        }
      }
      return {
        ok: true,
        orders,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not find orders',
      };
    }
  }

  async findOrder(user: User, { id }: FindOrderInput) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id },
        include: { restaurant: true },
      });

      if (!order) {
        return {
          ok: false,
          error: 'Order not found.',
        };
      }

      if (!this.canSeeOrder(user, order)) {
        return {
          ok: false,
          error: 'You cant see that',
        };
      }

      return {
        ok: true,
        order,
      };
    } catch (error) {
      return {
        ok: false,
        error,
      };
    }
  }

  async createOrder(
    customer: User,
    { restaurantId, items },
  ): Promise<CreateOrderOutput> {
    try {
      const restaurant = await this.prisma.restaurant.findUnique({
        where: { id: restaurantId },
      });

      if (!restaurant) {
        return {
          ok: false,
          error: 'Restaurant not found',
        };
      }

      let orderFinalPrice = 0;
      const orderItems = [];

      for (const item of items) {
        let dish;
        // eslint-disable-next-line prefer-const
        dish = await this.prisma.dish.findUnique({
          where: { id: item.dishId },
        });

        if (!dish) {
          // abort this whole thing
          return { ok: false, error: 'Dish not found.' };
        }

        let dishFinalPrice = dish.price;
        for (const itemOption of item.options) {
          const dishOption = dish.options.find(
            (dishOption: { name: any }) => dishOption.name === itemOption.name,
          );

          if (dishOption) {
            if (dishOption.extra) {
              dishFinalPrice = dishFinalPrice + dishOption.extra;
            } else {
              const dishOptionChoice = dishOption.choices?.find(
                (optionChoice: { name: any }) =>
                  optionChoice.name === itemOption.choice,
              );

              if (dishOptionChoice) {
                if (dishOptionChoice.extra) {
                  dishFinalPrice = dishFinalPrice + dishOptionChoice.extra;
                }
              }
            }
          }
        }
        orderFinalPrice = orderFinalPrice + dishFinalPrice;

        orderItems.push({
          dishId: dish.id,
          options: item.options,
        });
      }

      await this.prisma.order.create({
        data: {
          customerId: customer.id,
          restaurantId: restaurant.id,
          total: orderFinalPrice,
          items: {
            create: orderItems,
          },
        },
      });

      return { ok: true };
    } catch (error) {
      return { ok: false, error };
    }
  }

  canSeeOrder(user: User, order): boolean {
    let canSee = true;

    if (user.role === UserRole.Client && order.customerId !== user.id) {
      canSee = false;
    }
    if (user.role === UserRole.Delivery && order.driverId !== user.id) {
      canSee = false;
    }
    if (user.role === UserRole.Owner && order.restaurant.userId !== user.id) {
      canSee = false;
    }
    return canSee;
  }
}
