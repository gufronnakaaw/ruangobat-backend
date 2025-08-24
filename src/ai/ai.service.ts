import { HttpService } from '@nestjs/axios';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prompt, PromptType } from '@prisma/client';
import { ModelMessage } from 'ai';
import { AxiosResponse } from 'axios';
import { DateTime } from 'luxon';
import { firstValueFrom } from 'rxjs';
import { ind, removeStopwords } from 'stopword';
import { fetch } from 'undici';
import { decryptString, encryptString } from '../utils/crypto.util';
import { PrismaService } from '../utils/services/prisma.service';
import { StorageService } from '../utils/services/storage.service';
import { buildContext, buildPrompt } from '../utils/string.util';
import {
  AiQuery,
  AiResponse,
  CreateAiLimitDto,
  CreateContextDto,
  CreateProviderDto,
  CreateUserAiLimitDto,
  Message,
  UpdateAiLimitDto,
  UpdateContextDto,
  UpdateProviderDto,
  UpdateProviderStatusDto,
  UpdateThreadDto,
  UpdateUserAiLimitDto,
  UpsertPromptDto,
  UserChatCompletionDto,
} from './ai.dto';

@Injectable()
export class AiService {
  constructor(
    private prisma: PrismaService,
    private readonly http: HttpService,
    private storage: StorageService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  getProviders() {
    return this.prisma.aiProvider.findMany({
      select: {
        provider_id: true,
        name: true,
        model: true,
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
  }

  getProvider(provider_id: string) {
    return this.prisma.aiProvider
      .findUnique({
        where: { provider_id },
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
      })
      .then((provider) => {
        if (!provider) {
          return {};
        }

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
      },
      select: {
        provider_id: true,
      },
    });
  }

  async updateProviderStatus(body: UpdateProviderStatusDto) {
    if (
      !(await this.prisma.aiProvider.count({
        where: { provider_id: body.provider_id },
      }))
    ) {
      throw new NotFoundException('Provider tidak ditemukan');
    }

    if (body.is_active) {
      await this.prisma.aiProvider.updateMany({
        where: {
          provider_id: { not: body.provider_id },
          is_active: true,
        },
        data: {
          is_active: false,
        },
      });

      return this.prisma.aiProvider.update({
        where: {
          provider_id: body.provider_id,
        },
        data: {
          is_active: body.is_active,
          updated_by: body.by,
        },
        select: {
          provider_id: true,
        },
      });
    }

    return this.prisma.aiProvider.update({
      where: {
        provider_id: body.provider_id,
      },
      data: {
        is_active: body.is_active,
        updated_by: body.by,
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

  async getContextsFiltered(query: AiQuery) {
    const default_page = 1;
    const take = 10;
    const page = Number(query.page) || default_page;
    const skip = (page - 1) * take;

    const where: any = {};

    if (query.q) {
      where.OR = [
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
      ];
    }

    const [total_contexts, contexts] = await this.prisma.$transaction([
      this.prisma.aiContext.count({ where }),
      this.prisma.aiContext.findMany({
        where,
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
      page,
      total_contexts,
      total_pages: Math.ceil(total_contexts / take),
    };
  }

  getContext(context_id: string) {
    return this.prisma.aiContext
      .findUnique({
        where: { context_id },
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
      })
      .then((context) => {
        if (!context) {
          return {};
        }

        return context;
      });
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

  async getChat(user_id: string, timezone = 'Asia/Jakarta') {
    const today = DateTime.now().setZone(timezone).startOf('day');
    const until = today.plus({ days: 1 });

    const chats = await this.prisma.aiChat.findMany({
      where: {
        user_id,
        created_at: {
          gte: today.toJSDate(),
          lt: until.toJSDate(),
        },
      },
      select: {
        chat_id: true,
        question: true,
        answer: true,
        image: { select: { image_id: true, img_url: true } },
      },
    });

    return chats.flatMap((chat) => [
      {
        role: 'user',
        content: chat.question,
        images: chat.image,
        chat_id: `${chat.chat_id}-user`,
      },
      {
        role: 'assistant',
        content: chat.answer,
        chat_id: `${chat.chat_id}-assistant`,
      },
    ]);
  }

  async chatCompletion(user_id: string, body: UserChatCompletionDto) {
    const { input } = body;
    const [provider, user_chats] = await this.prisma.$transaction([
      this.prisma.aiProvider.findFirst({
        where: {
          is_active: true,
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
        take: 4,
      }),
    ]);

    if (!provider) {
      return {
        role: 'assistant',
        content: 'Maaf ya fitur chat untuk sementara tidak tersedia 😫',
      };
    }

    const prompt = buildPrompt();

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
      usage: {
        include: true,
      },
    };

    try {
      const response: AxiosResponse<AiResponse> = await firstValueFrom(
        this.http.post(provider.api_url, { ...data }, { ...config }),
      );

      const { role, content } = response.data.choices[0].message;

      await this.prisma.aiChat.create({
        data: {
          user_id,
          question: input,
          answer: content,
          model: provider.model,
          source: 'web',
          prompt_tokens: response.data.usage.prompt_tokens,
          completion_tokens: response.data.usage.completion_tokens,
          total_tokens: response.data.usage.total_tokens,
          total_cost: response.data.usage.cost,
        },
      });

      return { role, content };
    } catch (error) {
      return {
        role: 'assistant',
        content:
          'Ups sepertinya server kita ada masalah. Maaf ya atas ketidaknyamanannya 😫',
        error,
      };
    }
  }

  async chatStreaming(
    provider: {
      model: string;
      api_key: string;
      api_url: string;
    },
    messages: Message[],
  ) {
    const data = {
      model: provider.model,
      messages,
      usage: {
        include: true,
      },
      stream: true,
      temperature: 0.9,
    };

    try {
      const response = await fetch(provider.api_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${decryptString(
            provider.api_key,
            process.env.ENCRYPT_KEY,
          )}`,
        },
        body: JSON.stringify(data),
      });

      return response.body;
    } catch (error) {
      console.log('Error in chatStreaming:', error);
      return `event: error\ndata: Ups sepertinya ada masalah di komunikasi server aku 😫\n\n` as string;
    }
  }

  async getMessages(user_id: string, body: UserChatCompletionDto) {
    const { input, timezone } = body;
    const today = DateTime.now().setZone(timezone).startOf('day');
    const until = today.plus({ days: 1 });

    const keywords = removeStopwords(input.split(' '), ind);

    try {
      const [provider, user_chats, contexts] = await this.prisma.$transaction([
        this.prisma.aiProvider.findFirst({
          where: {
            is_active: true,
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
            created_at: {
              gte: today.toJSDate(),
              lt: until.toJSDate(),
            },
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
        this.prisma.aiContext.findMany({
          where: {
            is_active: true,
            OR: keywords.map((word) => ({
              OR: [
                { title: { contains: word } },
                { content: { contains: word } },
              ],
            })),
          },
          select: {
            title: true,
            content: true,
          },
        }),
      ]);

      if (!provider) {
        return `event: error\ndata: Maaf ya fitur chat untuk sementara tidak tersedia 😫\n\n` as string;
      }

      const system_prompt: {
        type: 'text' | 'image_url';
        text?: string;
        image_url?: {
          url: string;
        };
      }[] = [];

      const cache = (await this.cacheManager.get('system_prompt')) as Pick<
        Prompt,
        'type' | 'content'
      >[];

      let instruction;
      let answer_format;

      if (cache) {
        instruction = cache.find((item) => item.type === 'INSTRUCTION');
        answer_format = cache.find((item) => item.type === 'ANSWER_FORMAT');
      } else {
        const prompts = await this.prisma.prompt.findMany({
          select: { type: true, content: true },
        });

        await this.cacheManager.set('system_prompt', prompts, 60 * 1000 * 5);

        instruction = prompts.find((item) => item.type === 'INSTRUCTION');
        answer_format = prompts.find((item) => item.type === 'ANSWER_FORMAT');
      }

      system_prompt.push({
        type: 'text',
        text: instruction ? instruction.content : '',
      });

      if (contexts.length) {
        system_prompt.push({
          type: 'text',
          text: buildContext(contexts.map((context) => context.content)),
        });
      }

      system_prompt.push({
        type: 'text',
        text: answer_format ? answer_format.content : '',
      });

      const messages: Message[] = [
        {
          role: 'system',
          content: system_prompt,
        },
      ];

      if (!user_chats.length) {
        if (Array.isArray(body.img_url) && body.img_url.length) {
          messages.push({
            role: 'user',
            content: [
              {
                type: 'text',
                text: input,
              },
              ...(body.img_url.map((image) => {
                return {
                  type: 'image_url',
                  image_url: { url: image },
                };
              }) as { type: 'image_url'; image_url: { url: string } }[]),
            ],
          });
        } else {
          messages.push({
            role: 'user',
            content: input,
          });
        }
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

        if (Array.isArray(body.img_url) && body.img_url.length) {
          messages.push({
            role: 'user',
            content: [
              {
                type: 'text',
                text: input,
              },
              ...(body.img_url.map((image) => {
                return {
                  type: 'image_url',
                  image_url: { url: image },
                };
              }) as { type: 'image_url'; image_url: { url: string } }[]),
            ],
          });
        } else {
          messages.push({
            role: 'user',
            content: input,
          });
        }
      }

      return {
        provider,
        messages,
      };
    } catch (error) {
      console.log('Error in getMessages:', error);
      return `event: error\ndata: Ups sepertinya ada masalah di server database aku 😫\n\n` as string;
    }
  }

  async saveChat(params: {
    user_id: string;
    input: string;
    answer: string;
    model: string;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost: number;
    img_url?: string[];
    thread_id?: string;
  }) {
    const {
      user_id,
      input,
      answer,
      model,
      prompt_tokens,
      completion_tokens,
      total_tokens,
      cost,
      img_url,
      thread_id,
    } = params;

    return this.prisma.aiChat.create({
      data: {
        user_id,
        question: input,
        answer,
        model,
        source: 'web',
        prompt_tokens,
        completion_tokens,
        total_tokens,
        total_cost: cost,
        thread_id,
        ...(Array.isArray(img_url) && img_url.length
          ? {
              image: {
                createMany: {
                  data: img_url.map((url) => ({
                    img_url: url,
                  })),
                },
              },
            }
          : {}),
      },
    });
  }

  async getChatLogsFiltered(query: AiQuery) {
    const default_page = 1;
    const take = 10;
    const page = Number(query.page) || default_page;
    const skip = (page - 1) * take;

    const where: any = {};

    if (query.q) {
      where.OR = [
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
      ];
    }

    const [total_logs, logs] = await this.prisma.$transaction([
      this.prisma.aiChat.count({
        where,
      }),
      this.prisma.aiChat.findMany({
        where,
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
          total_cost: true,
          total_tokens: true,
          created_at: true,
          image: {
            select: {
              image_id: true,
              img_url: true,
            },
          },
        },
      }),
    ]);

    return {
      logs: logs.map((log) => {
        const { user, ...rest } = log;

        return {
          ...user,
          ...rest,
          images: rest.image.map((img) => ({
            image_id: img.image_id,
            img_url: img.img_url,
          })),
          total_cost: Number(rest.total_cost),
        };
      }),
      page,
      total_logs,
      total_pages: Math.ceil(total_logs / take),
    };
  }

  async checkLimitUser(user_id: string, timezone = 'Asia/Jakarta') {
    const today = DateTime.now().setZone(timezone).startOf('day');
    const until = today.plus({ days: 1 });

    const [user_limit, total_user_chats, global_limits, access] =
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
              gte: today.toJSDate(),
              lt: until.toJSDate(),
            },
          },
        }),
        this.prisma.aiLimit.findMany({
          select: { total: true, type: true },
        }),
        this.prisma.access.count({
          where: {
            user_id,
            status: 'active',
            OR: [
              { type: 'apotekerclass' },
              { type: 'videocourse' },
              { type: 'videoukmppai' },
            ],
          },
        }),
      ]);

    const paid =
      global_limits.find((limit) => limit.type === 'paid')?.total ?? 0;
    const free =
      global_limits.find((limit) => limit.type === 'free')?.total ?? 0;

    const getResult = (total: number) => ({
      total,
      remaining: Math.max(0, total - total_user_chats),
    });

    if (user_limit) {
      const now = new Date();
      const expired = new Date(user_limit.expired_at);

      if (now > expired) {
        return access ? getResult(paid) : getResult(free);
      }
      return getResult(user_limit.total);
    }

    return access ? getResult(paid) : getResult(free);
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

  async getAiLimitUsersFiltered(query: AiQuery) {
    const default_page = 1;
    const take = 10;
    const page = Number(query.page) || default_page;
    const skip = (page - 1) * take;

    const where: any = {};

    if (query.q) {
      where.user = {
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
      };
    }

    const [total_users, users] = await this.prisma.$transaction([
      this.prisma.userAiLimit.count({ where }),
      this.prisma.userAiLimit.findMany({
        where,
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
      page,
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

  async deleteChatImage(key: string) {
    return this.storage.deleteFile(key);
  }

  getPrompts() {
    return this.prisma.prompt.findMany({
      select: {
        prompt_id: true,
        content: true,
        type: true,
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

  upsertPrompt(body: UpsertPromptDto) {
    return this.prisma.prompt.upsert({
      where: { prompt_id: body.prompt_id },
      create: {
        content: body.content,
        type: body.type,
        created_by: body.by,
        updated_by: body.by,
      },
      update: {
        content: body.content,
        type: body.type,
        updated_by: body.by,
      },
      select: {
        prompt_id: true,
      },
    });
  }

  async getActiveProvider() {
    const provider = await this.prisma.aiProvider.findFirst({
      where: {
        is_active: true,
      },
      select: {
        api_key: true,
        model: true,
      },
    });

    if (!provider) {
      return `Server-nya lagi ngambek sedikit 🤏, aku coba ajak baikan dulu ya!`;
    }

    return {
      api_key: decryptString(provider.api_key, process.env.ENCRYPT_KEY),
      model: provider.model,
    };
  }

  async getChatHistories(
    user_id: string,
    timezone = 'Asia/Jakarta',
  ): Promise<ModelMessage[]> {
    const today = DateTime.now().setZone(timezone).startOf('day');
    const until = today.plus({ days: 1 });

    const histories = await this.prisma.aiChat.findMany({
      where: {
        user_id,
        created_at: {
          gte: today.toJSDate(),
          lt: until.toJSDate(),
        },
      },
      select: {
        question: true,
        answer: true,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 10,
    });

    return histories.reverse().flatMap((item) => [
      { role: 'user', content: item.question },
      { role: 'assistant', content: item.answer },
    ]);
  }

  async getSystemPrompt(input: string) {
    const messages: ModelMessage[] = [];

    const keywords = removeStopwords(input.split(' '), ind);

    const contexts = await this.prisma.aiContext.findMany({
      where: {
        is_active: true,
        OR: keywords.map((word) => ({
          OR: [{ title: { contains: word } }, { content: { contains: word } }],
        })),
      },
      select: {
        title: true,
        content: true,
      },
    });

    const cache = (await this.cacheManager.get('system_prompt')) as Pick<
      Prompt,
      'type' | 'content'
    >[];

    let instruction: {
      type: PromptType;
      content: string;
    };
    let answer_format: {
      type: PromptType;
      content: string;
    };

    if (cache) {
      instruction = cache.find((item) => item.type === 'INSTRUCTION');
      answer_format = cache.find((item) => item.type === 'ANSWER_FORMAT');
    } else {
      const prompts = await this.prisma.prompt.findMany({
        select: { type: true, content: true },
      });

      await this.cacheManager.set('system_prompt', prompts, 60 * 1000 * 5);

      instruction = prompts.find((item) => item.type === 'INSTRUCTION');
      answer_format = prompts.find((item) => item.type === 'ANSWER_FORMAT');
    }

    messages.push({
      role: 'system',
      content: instruction ? instruction.content : '',
    });

    if (contexts.length) {
      messages.push({
        role: 'system',
        content: buildContext(contexts.map((context) => context.content)),
      });
    }

    messages.push({
      role: 'system',
      content: answer_format ? answer_format.content : '',
    });

    return messages;
  }

  getThreads(user_id: string, archive: number) {
    return this.prisma.aiThread.findMany({
      where: {
        user_id,
        is_archived: Boolean(archive),
      },
      select: {
        thread_id: true,
        title: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  createThread(user_id: string) {
    return this.prisma.aiThread.create({
      data: {
        user_id,
        title: 'New Chat',
      },
      select: {
        thread_id: true,
      },
    });
  }

  async updateThread(body: UpdateThreadDto, user_id: string) {
    if (
      !(await this.prisma.aiThread.findFirst({
        where: { thread_id: body.thread_id, user_id },
        select: { thread_id: true },
      }))
    ) {
      throw new NotFoundException('Thread tidak ditemukan');
    }

    return this.prisma.aiThread.update({
      where: { thread_id: body.thread_id, user_id },
      data: {
        is_archived: body.is_archived,
      },
      select: {
        thread_id: true,
      },
    });
  }

  async getChatByThreadId(user_id: string, thread_id: string) {
    const chats = await this.prisma.aiChat.findMany({
      where: {
        user_id,
        thread_id,
      },
      select: {
        chat_id: true,
        question: true,
        answer: true,
        image: { select: { image_id: true, img_url: true } },
      },
    });

    return chats.flatMap((chat) => [
      {
        role: 'user',
        content: chat.question,
        images: chat.image,
        chat_id: `${chat.chat_id}-user`,
      },
      {
        role: 'assistant',
        content: chat.answer,
        chat_id: `${chat.chat_id}-assistant`,
      },
    ]);
  }
}
