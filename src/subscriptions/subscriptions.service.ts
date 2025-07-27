import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../utils/services/prisma.service';
import {
  CreateSubscriptionPackageDto,
  SubscriptionsQuery,
  UpdateSubscriptionPackageDto,
} from './subscriptions.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async getPackages(query: SubscriptionsQuery) {
    const default_page = 1;
    const take = 10;
    const page = Number(query.page) || default_page;
    const skip = (page - 1) * take;

    const [total_packages, packages] = await this.prisma.$transaction([
      this.prisma.subscriptionPackage.count({
        where: {
          type: query.type,
        },
      }),
      this.prisma.subscriptionPackage.findMany({
        where: {
          type: query.type,
        },
        skip,
        take,
        select: {
          package_id: true,
          name: true,
          price: true,
          duration: true,
          type: true,
          link_order: true,
          is_active: true,
          created_at: true,
        },
        orderBy: {
          price: 'asc',
        },
      }),
    ]);

    return {
      packages,
      page,
      total_packages,
      total_pages: Math.ceil(total_packages / take),
    };
  }

  getPackage(package_id: string) {
    return this.prisma.subscriptionPackage
      .findUnique({
        where: {
          package_id,
        },
        select: {
          package_id: true,
          name: true,
          price: true,
          duration: true,
          type: true,
          link_order: true,
          is_active: true,
          created_at: true,
          benefit: {
            select: {
              benefit_id: true,
              description: true,
            },
          },
        },
      })
      .then((item) => {
        if (!item) {
          return {};
        }

        const { benefit: benefits, ...all } = item;

        return {
          ...all,
          benefits,
        };
      });
  }

  createPackage(body: CreateSubscriptionPackageDto) {
    return this.prisma.subscriptionPackage.create({
      data: {
        name: body.name,
        price: body.price,
        duration: body.duration,
        type: body.type,
        link_order: body.link_order,
        created_by: body.by,
        updated_by: body.by,
        benefit: {
          createMany: {
            data: body.benefits.map((benefit) => ({
              description: benefit,
              created_by: body.by,
              updated_by: body.by,
            })),
          },
        },
      },
      select: {
        package_id: true,
      },
    });
  }

  async updatePackage(body: UpdateSubscriptionPackageDto) {
    const { package_id, ...data } = body;

    if (
      !(await this.prisma.subscriptionPackage.count({ where: { package_id } }))
    ) {
      throw new NotFoundException('Paket tidak ditemukan');
    }

    return this.prisma.subscriptionPackage.update({
      where: {
        package_id,
      },
      data: {
        name: body.name,
        price: body.price,
        duration: body.duration,
        type: body.type,
        link_order: body.link_order,
        updated_by: body.by,
        is_active: body.is_active,
        benefit: data.benefits?.length
          ? {
              upsert: data.benefits.map((benefit) => ({
                where: {
                  benefit_id: benefit.benefit_id,
                },
                create: {
                  description: benefit.description,
                  created_by: body.by,
                  updated_by: body.by,
                },
                update: {
                  description: benefit.description,
                  updated_by: body.by,
                },
              })),
            }
          : undefined,
      },
      select: {
        package_id: true,
      },
    });
  }

  async deletePackage(package_id: string) {
    if (
      !(await this.prisma.subscriptionPackage.count({ where: { package_id } }))
    ) {
      throw new NotFoundException('Paket tidak ditemukan');
    }

    return this.prisma.subscriptionPackage.delete({
      where: {
        package_id,
      },
      select: {
        package_id: true,
      },
    });
  }

  async deleteBenefit(benefit_id: string) {
    if (
      !(await this.prisma.subscriptionBenefit.count({
        where: { benefit_id },
      }))
    ) {
      throw new NotFoundException('Benefit tidak ditemukan');
    }

    return this.prisma.subscriptionBenefit.delete({
      where: {
        benefit_id,
      },
      select: {
        benefit_id: true,
      },
    });
  }
}
