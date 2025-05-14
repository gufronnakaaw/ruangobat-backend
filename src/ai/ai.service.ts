import { Injectable, NotFoundException } from '@nestjs/common';
import { decryptString, encryptString } from '../utils/crypto.util';
import { PrismaService } from '../utils/services/prisma.service';
import {
  AiQuery,
  CreateContextDto,
  CreateProviderDto,
  UpdateContextDto,
  UpdateProviderDto,
} from './ai.dto';

@Injectable()
export class AiService {
  constructor(private prisma: PrismaService) {}

  async getProviders() {
    const providers = await this.prisma.aiProvider.findMany({
      select: {
        provider_id: true,
        name: true,
        model: true,
        api_key: true,
        api_url: true,
        type: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        created_by: true,
        updated_by: true,
      },
    });

    return providers.map((provider) => {
      return {
        ...provider,
        api_key: decryptString(provider.api_key, process.env.ENCRYPT_KEY),
      };
    });
  }

  createProvider(body: CreateProviderDto) {
    return this.prisma.aiProvider.create({
      data: {
        name: body.name,
        model: body.model,
        api_key: encryptString(body.api_key, process.env.ENCRYPT_KEY),
        api_url: body.api_url,
        type: body.type,
        created_by: body.by,
        updated_by: body.by,
      },
      select: {
        provider_id: true,
      },
    });
  }

  async updateProvider(body: UpdateProviderDto) {
    if (
      !(await this.prisma.aiProvider.count({
        where: { provider_id: body.provider_id },
      }))
    ) {
      throw new NotFoundException('Provider tidak ditemukan');
    }

    return this.prisma.aiProvider.update({
      where: {
        provider_id: body.provider_id,
      },
      data: {
        name: body.name,
        model: body.model,
        api_key: body.api_key
          ? encryptString(body.api_key, process.env.ENCRYPT_KEY)
          : undefined,
        api_url: body.api_url,
        type: body.type,
        updated_by: body.by,
        is_active: body.is_active,
      },
      select: {
        provider_id: true,
      },
    });
  }

  async deleteProvider(provider_id: string) {
    if (
      !(await this.prisma.aiProvider.count({
        where: {
          provider_id,
        },
      }))
    ) {
      throw new NotFoundException('Provider tidak ditemukan');
    }

    return this.prisma.aiProvider.delete({
      where: {
        provider_id,
      },
      select: {
        provider_id: true,
      },
    });
  }

  async getContexts(query: AiQuery) {
    const default_page = 1;
    const take = 10;

    const page = parseInt(query.page) ? parseInt(query.page) : default_page;

    const skip = (page - 1) * take;

    const [total_contexts, contexts] = await this.prisma.$transaction([
      this.prisma.aiContext.count(),
      this.prisma.aiContext.findMany({
        take,
        skip,
        orderBy: {
          created_at: 'desc',
        },
        select: {
          context_id: true,
          title: true,
          content: true,
          type: true,
          is_active: true,
          created_at: true,
          updated_at: true,
          created_by: true,
          updated_by: true,
        },
      }),
    ]);

    return {
      contexts,
      page: parseInt(query.page),
      total_contexts,
      total_pages: Math.ceil(total_contexts / take),
    };
  }

  async getContextsBySearch(query: AiQuery) {
    const default_page = 1;
    const take = 10;

    const page = parseInt(query.page) ? parseInt(query.page) : default_page;

    const skip = (page - 1) * take;

    const [total_contexts, contexts] = await this.prisma.$transaction([
      this.prisma.aiContext.count({
        where: {
          OR: [
            {
              title: {
                contains: query.q,
              },
            },
            {
              content: {
                contains: query.q,
              },
            },
          ],
        },
      }),
      this.prisma.aiContext.findMany({
        where: {
          OR: [
            {
              title: {
                contains: query.q,
              },
            },
            {
              content: {
                contains: query.q,
              },
            },
          ],
        },
        take,
        skip,
        orderBy: {
          created_at: 'desc',
        },
        select: {
          context_id: true,
          title: true,
          content: true,
          type: true,
          is_active: true,
          created_at: true,
          updated_at: true,
          created_by: true,
          updated_by: true,
        },
      }),
    ]);

    return {
      contexts,
      page: parseInt(query.page),
      total_contexts,
      total_pages: Math.ceil(total_contexts / take),
    };
  }

  createContext(body: CreateContextDto) {
    return this.prisma.aiContext.create({
      data: {
        title: body.title,
        content: body.content,
        type: body.type,
        created_by: body.by,
        updated_by: body.by,
      },
      select: {
        context_id: true,
      },
    });
  }

  async updateContext(body: UpdateContextDto) {
    if (
      !(await this.prisma.aiContext.count({
        where: { context_id: body.context_id },
      }))
    ) {
      throw new NotFoundException('Konteks tidak ditemukan');
    }

    return this.prisma.aiContext.update({
      where: {
        context_id: body.context_id,
      },
      data: {
        title: body.title,
        content: body.content,
        type: body.type,
        updated_by: body.by,
        is_active: body.is_active,
      },
      select: {
        context_id: true,
      },
    });
  }

  async deleteContext(context_id: string) {
    if (!(await this.prisma.aiContext.count({ where: { context_id } }))) {
      throw new NotFoundException('Konteks tidak ditemukan');
    }

    return this.prisma.aiContext.delete({
      where: { context_id },
      select: {
        context_id: true,
      },
    });
  }
}
