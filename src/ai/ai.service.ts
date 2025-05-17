import { HttpService } from '@nestjs/axios';
import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { decryptString, encryptString } from '../utils/crypto.util';
import { PrismaService } from '../utils/services/prisma.service';
import {
  AiQuery,
  CreateAiLimitDto,
  CreateContextDto,
  CreateProviderDto,
  CreateUserAiLimitDto,
  UpdateAiLimitDto,
  UpdateContextDto,
  UpdateProviderDto,
  UpdateUserAiLimitDto,
} from './ai.dto';

@Injectable()
export class AiService {
  constructor(
    private prisma: PrismaService,
    private readonly http: HttpService,
  ) {}

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
      orderBy: {
        created_at: 'desc',
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

  async chatCompletion(user_id: string, input: string) {
    const [provider, user_chats] = await this.prisma.$transaction([
      this.prisma.aiProvider.findFirst({
        where: {
          is_active: true,
          type: 'paid',
        },
        orderBy: {
          created_at: 'desc',
        },
        select: {
          api_key: true,
          api_url: true,
          model: true,
        },
      }),
      this.prisma.aiChat.findMany({
        where: {
          user_id,
        },
        select: {
          question: true,
          answer: true,
        },
        orderBy: {
          created_at: 'desc',
        },
        take: 5,
      }),
    ]);

    if (!provider) {
      throw new ServiceUnavailableException(
        'Fitur chat untuk sementara tidak tersedia',
      );
    }

    const prompt = `${process.env.PROMPT_HEADER}\n${process.env.PROMPT_FOOTER}`;

    const messages = [
      {
        role: 'system',
        content: prompt,
      },
    ];

    if (!user_chats.length) {
      messages.push({
        role: 'user',
        content: input,
      });
    } else {
      const reverse_chats = user_chats.reverse();

      for (const chat of reverse_chats) {
        messages.push(
          {
            role: 'user',
            content: chat.question,
          },
          {
            role: 'assistant',
            content: chat.answer,
          },
        );
      }

      messages.push({
        role: 'user',
        content: input,
      });
    }

    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${decryptString(
          provider.api_key,
          process.env.ENCRYPT_KEY,
        )}`,
      },
    };

    const data = {
      model: provider.model,
      messages,
    };

    try {
      const response = await firstValueFrom(
        this.http.post(provider.api_url, { ...data }, { ...config }),
      );

      await this.prisma.aiChat.create({
        data: {
          user_id,
          question: input,
          answer: response.data.choices[0].message.content,
          model: provider.model,
          source: 'web',
        },
      });

      return response.data.choices[0].message;
    } catch (error) {
      return {
        role: 'assistant',
        content: 'Terjadi kesalahan saat memproses pertanyaan',
      };
    }
  }

  async getChatLogs(query: AiQuery) {
    const default_page = 1;
    const take = 10;

    const page = parseInt(query.page) ? parseInt(query.page) : default_page;

    const skip = (page - 1) * take;

    const [total_logs, logs] = await this.prisma.$transaction([
      this.prisma.aiChat.count(),
      this.prisma.aiChat.findMany({
        take,
        skip,
        orderBy: {
          created_at: 'desc',
        },
        select: {
          chat_id: true,
          user: {
            select: {
              user_id: true,
              fullname: true,
            },
          },
          model: true,
          source: true,
          question: true,
          answer: true,
          created_at: true,
        },
      }),
    ]);

    return {
      logs: logs.map((log) => {
        const { user, ...all } = log;

        return {
          ...user,
          ...all,
        };
      }),
      page: parseInt(query.page),
      total_logs,
      total_pages: Math.ceil(total_logs / take),
    };
  }

  async getChatLogsBySearch(query: AiQuery) {
    const default_page = 1;
    const take = 10;

    const page = parseInt(query.page) ? parseInt(query.page) : default_page;

    const skip = (page - 1) * take;

    const [total_logs, logs] = await this.prisma.$transaction([
      this.prisma.aiChat.count({
        where: {
          OR: [
            {
              user: {
                user_id: {
                  contains: query.q,
                },
              },
            },
            {
              user: {
                fullname: {
                  contains: query.q,
                },
              },
            },
          ],
        },
      }),
      this.prisma.aiChat.findMany({
        where: {
          OR: [
            {
              user: {
                user_id: {
                  contains: query.q,
                },
              },
            },
            {
              user: {
                fullname: {
                  contains: query.q,
                },
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
          chat_id: true,
          user: {
            select: {
              user_id: true,
              fullname: true,
            },
          },
          model: true,
          source: true,
          question: true,
          answer: true,
          created_at: true,
        },
      }),
    ]);

    return {
      logs: logs.map((log) => {
        const { user, ...all } = log;

        return {
          ...user,
          ...all,
        };
      }),
      page: parseInt(query.page),
      total_logs,
      total_pages: Math.ceil(total_logs / take),
    };
  }

  async checkLimitUser(user_id: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const until = new Date(today);
    until.setDate(until.getDate() + 1);

    const [user_limit, total_user_chats, global_limits] =
      await this.prisma.$transaction([
        this.prisma.userAiLimit.findUnique({
          where: { user_id },
          select: {
            total: true,
            expired_at: true,
          },
        }),
        this.prisma.aiChat.count({
          where: {
            user_id,
            created_at: {
              gte: today,
              lt: until,
            },
          },
        }),
        this.prisma.aiLimit.findFirst({
          select: { total: true },
          where: { type: 'paid' },
        }),
      ]);

    if (user_limit) {
      const now = new Date();
      const expired = new Date(user_limit.expired_at);

      if (now > expired) {
        return {
          total: global_limits.total,
          remaining: Math.max(0, global_limits.total - total_user_chats),
        };
      }

      return {
        total: user_limit.total,
        remaining: Math.max(0, user_limit.total - total_user_chats),
      };
    }

    return {
      total: global_limits.total,
      remaining: Math.max(0, global_limits.total - total_user_chats),
    };
  }

  getAiLimits() {
    return this.prisma.aiLimit.findMany({
      select: {
        limit_id: true,
        type: true,
        total: true,
        created_at: true,
        updated_at: true,
        created_by: true,
        updated_by: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  createAiLimit(body: CreateAiLimitDto) {
    return this.prisma.aiLimit.create({
      data: {
        type: body.type,
        total: body.total,
        created_by: body.by,
        updated_by: body.by,
      },
      select: {
        limit_id: true,
      },
    });
  }

  async updateAiLimit(body: UpdateAiLimitDto) {
    if (
      !(await this.prisma.aiLimit.count({ where: { limit_id: body.limit_id } }))
    ) {
      throw new NotFoundException('Limit tidak ditemukan');
    }

    return this.prisma.aiLimit.update({
      where: {
        limit_id: body.limit_id,
      },
      data: {
        type: body.type,
        total: body.total,
        updated_by: body.by,
      },
      select: {
        limit_id: true,
      },
    });
  }

  async deleteAiLimit(limit_id: string) {
    if (!(await this.prisma.aiLimit.count({ where: { limit_id } }))) {
      throw new NotFoundException('Limit tidak ditemukan');
    }

    return this.prisma.aiLimit.delete({
      where: { limit_id },
      select: {
        limit_id: true,
      },
    });
  }

  async getAiLimitUsers(query: AiQuery) {
    const default_page = 1;
    const take = 10;

    const page = parseInt(query.page) ? parseInt(query.page) : default_page;

    const skip = (page - 1) * take;

    const [total_users, users] = await this.prisma.$transaction([
      this.prisma.userAiLimit.count(),
      this.prisma.userAiLimit.findMany({
        take,
        skip,
        orderBy: {
          created_at: 'desc',
        },
        select: {
          user: {
            select: {
              user_id: true,
              fullname: true,
            },
          },
          total: true,
          expired_at: true,
          created_at: true,
          updated_at: true,
          created_by: true,
          updated_by: true,
        },
      }),
    ]);

    return {
      users: users.map((user) => {
        const { user: user_data, ...all } = user;

        return {
          ...user_data,
          ...all,
        };
      }),
      page: parseInt(query.page),
      total_users,
      total_pages: Math.ceil(total_users / take),
    };
  }

  async getAiLimitUsersBySearch(query: AiQuery) {
    const default_page = 1;
    const take = 10;

    const page = parseInt(query.page) ? parseInt(query.page) : default_page;

    const skip = (page - 1) * take;

    const [total_users, users] = await this.prisma.$transaction([
      this.prisma.userAiLimit.count({
        where: {
          user: {
            OR: [
              {
                user_id: {
                  contains: query.q,
                },
              },
              {
                fullname: {
                  contains: query.q,
                },
              },
            ],
          },
        },
      }),
      this.prisma.userAiLimit.findMany({
        where: {
          user: {
            OR: [
              {
                user_id: {
                  contains: query.q,
                },
              },
              {
                fullname: {
                  contains: query.q,
                },
              },
            ],
          },
        },
        take,
        skip,
        orderBy: {
          created_at: 'desc',
        },
        select: {
          user: {
            select: {
              user_id: true,
              fullname: true,
            },
          },
          total: true,
          expired_at: true,
          created_at: true,
          updated_at: true,
          created_by: true,
          updated_by: true,
        },
      }),
    ]);

    return {
      users: users.map((user) => {
        const { user: user_data, ...all } = user;

        return {
          ...user_data,
          ...all,
        };
      }),
      page: parseInt(query.page),
      total_users,
      total_pages: Math.ceil(total_users / take),
    };
  }

  async createUserAiLimit(body: CreateUserAiLimitDto) {
    if (!(await this.prisma.user.count({ where: { user_id: body.user_id } }))) {
      throw new NotFoundException('User tidak ditemukan');
    }

    if (
      await this.prisma.userAiLimit.count({ where: { user_id: body.user_id } })
    ) {
      throw new ConflictException('User sudah memiliki limit');
    }

    return this.prisma.userAiLimit.create({
      data: {
        user_id: body.user_id,
        total: body.total,
        expired_at: body.expired_at,
        created_by: body.by,
        updated_by: body.by,
      },
      select: {
        user_id: true,
      },
    });
  }

  async updateUserAiLimit(body: UpdateUserAiLimitDto) {
    if (
      !(await this.prisma.userAiLimit.count({
        where: { user_id: body.user_id },
      }))
    ) {
      throw new NotFoundException('User tidak ditemukan');
    }

    return this.prisma.userAiLimit.update({
      where: {
        user_id: body.user_id,
      },
      data: {
        total: body.total,
        expired_at: body.expired_at,
        updated_by: body.by,
      },
      select: {
        user_id: true,
      },
    });
  }

  async deleteUserAiLimit(user_id: string) {
    if (!(await this.prisma.userAiLimit.count({ where: { user_id } }))) {
      throw new NotFoundException('User tidak ditemukan');
    }

    return this.prisma.userAiLimit.delete({
      where: { user_id },
      select: {
        user_id: true,
      },
    });
  }
}
