import { Injectable } from '@nestjs/common';
import { CreateRestaurantInputArgs } from './dtos/create-restaurant.dto';

import { PrismaService } from '../../prisma/prisma.service';
import { User } from '../users/models/user.model';
import {
  DeleteRestaurantInput,
  DeleteRestaurantOutput,
} from './dtos/delete-restaurant.dto';
import { FindManyCategoriesOutput } from './dtos/find-categories.dto';
import { CategoryInput, CategoryOutput } from './dtos/find-category.dto';
import { RestaurantInput, RestaurantOutput } from './dtos/find-restaurant.dto';
import {
  RestaurantsInput,
  RestaurantsOutput,
} from './dtos/find-restaurants.dto';
import {
  SearchRestaurantInput,
  SearchRestaurantOutput,
} from './dtos/search-restaurant.dto';
import { UpdateRestaurantInputArgs } from './dtos/update-restaurant.dto';
import { Category } from './models/category.model';

@Injectable()
export class RestaurantService {
  constructor(private prisma: PrismaService) {}

  async findMany({ page }: RestaurantsInput): Promise<RestaurantsOutput> {
    try {
      const totalResults = await this.prisma.restaurant.count();
      const restaurants = await this.prisma.restaurant.findMany({
        skip: (page - 1) * 25,
        take: 25,
      });

      return {
        ok: true,
        results: restaurants,
        totalPages: Math.ceil(totalResults / 3),
        totalResults,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not load restaurants',
      };
    }
  }

  async find({ restaurantId }: RestaurantInput): Promise<RestaurantOutput> {
    try {
      const restaurant = await this.prisma.restaurant.findUnique({
        where: { id: restaurantId },
      });
      if (!restaurant) throw new Error('Restaurant not found');
      return { ok: true, results: restaurant };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  async searchByName({
    query,
    page,
  }: SearchRestaurantInput): Promise<SearchRestaurantOutput> {
    try {
      const totalResults = await this.prisma.restaurant.count();
      const restaurants = await this.prisma.restaurant.findMany({
        skip: (page - 1) * 25,
        take: 25,
        where: { name: { contains: query, mode: 'insensitive' } },
      });

      return {
        ok: true,
        results: restaurants,
        totalResults,
        totalPages: Math.ceil(totalResults / 25),
      };
    } catch {
      return { ok: false, error: 'Could not search for restaurants' };
    }
  }

  async create(owner: User, createRestaurantInput: CreateRestaurantInputArgs) {
    try {
      const category = await this.categoryFindOrCreate(
        createRestaurantInput.categoryName,
      );

      delete createRestaurantInput.categoryName;

      const dataSend = {
        ...createRestaurantInput,
        categoryId: category.id,
        userId: owner.id,
      };

      await this.prisma.restaurant.create({
        data: dataSend,
      });

      return {
        ok: true,
      };
    } catch (error) {
      return { ok: false, error: 'Could not create restaurant' };
    }
  }

  async update(owner: User, params: UpdateRestaurantInputArgs) {
    try {
      const id = params.restaurantId;
      const categoryName = params.categoryName;
      let category = null;

      delete params.categoryName;
      delete params.restaurantId;

      const restaurant = await this.prisma.restaurant.findFirst({
        where: { id },
      });

      if (!restaurant) return { ok: false, error: 'Restaurant not found' };

      if (owner.id !== restaurant.userId) {
        return {
          ok: false,
          error: "You can't edit a restaurant you don't own.",
        };
      }

      if (categoryName) {
        category = await this.categoryFindOrCreate(categoryName);
      }

      await this.prisma.restaurant.update({
        where: { id },
        data: {
          ...params,
          categoryId: category.id,
        },
      });

      return { ok: true };
    } catch (error) {
      return { ok: false, error };
    }
  }

  async delete(
    owner: User,
    { restaurantId }: DeleteRestaurantInput,
  ): Promise<DeleteRestaurantOutput> {
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
      if (owner.id !== restaurant.userId) {
        return {
          ok: false,
          error: "You can't delete a restaurant that you don't own",
        };
      }
      await this.prisma.restaurant.delete({ where: { id: restaurantId } });
      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not delete restaurant.',
      };
    }
  }

  countRestaurants(category: Category) {
    return this.prisma.restaurant.count({
      where: { categoryId: category.id },
    });
  }

  async findManyCategories(): Promise<FindManyCategoriesOutput> {
    try {
      const categories = await this.prisma.category.findMany();
      return {
        ok: true,
        categories,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not load categories',
      };
    }
  }

  async findCategoryBySlug({
    slug,
    page,
  }: CategoryInput): Promise<CategoryOutput> {
    try {
      const category = await this.prisma.category.findFirst({
        where: { slug: slug },
        include: {
          restaurants: true,
        },
      });
      if (!category) {
        return {
          ok: false,
          error: 'Category not found',
        };
      }
      const restaurants = await this.prisma.restaurant.findMany({
        where: {
          categoryId: category.id,
        },
        take: 25,
        skip: (page - 1) * 25,
      });
      const totalResults = await this.countRestaurants(category);
      return {
        ok: true,
        restaurants,
        category,
        totalPages: Math.ceil(totalResults / 25),
        totalResults,
      };
    } catch {
      return {
        ok: false,
        error: 'Could not load category',
      };
    }
  }

  async categoryFindOrCreate(name: string) {
    const categoryName = name.trim().toLowerCase();
    const categorySlug = categoryName.replace(/ /g, '-');
    let category = await this.prisma.category.findFirst({
      where: { slug: categorySlug },
    });
    if (!category) {
      category = await this.prisma.category.create({
        data: { slug: categorySlug, name: categoryName },
      });
    }
    return category;
  }
}
