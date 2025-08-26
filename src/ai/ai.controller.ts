import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  NotFoundException,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  createOpenRouter,
  OpenRouterUsageAccounting,
} from '@openrouter/ai-sdk-provider';
import { ModelMessage, streamText } from 'ai';
import { Request, Response } from 'express';
import { SuccessResponse } from '../utils/global/global.response';
import { AdminGuard } from '../utils/guards/admin.guard';
import { PublicGuard } from '../utils/guards/public.guard';
import { UserGuard } from '../utils/guards/user.guard';
import { ZodValidationPipe } from '../utils/pipes/zod.pipe';
import { StorageService } from '../utils/services/storage.service';
import {
  AiQuery,
  createAiLimit,
  CreateAiLimitDto,
  CreateContextDto,
  createContextSchema,
  CreateProviderDto,
  createProviderSchema,
  createUserAiLimit,
  CreateUserAiLimitDto,
  updateAiLimit,
  UpdateAiLimitDto,
  UpdateContextDto,
  updateContextSchema,
  UpdateProviderDto,
  updateProviderSchema,
  UpdateProviderStatusDto,
  updateProviderStatusSchema,
  UpdateThreadDto,
  updateThreadSchema,
  updateUserAiLimit,
  UpdateUserAiLimitDto,
  UpsertPromptDto,
  upsertPromptSchema,
  UserChatCompletionDto,
  userChatCompletionSchema,
} from './ai.dto';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private storage: StorageService,
  ) {}

  @UseGuards(AdminGuard)
  @Get('/providers')
  @HttpCode(HttpStatus.OK)
  async getProviders(): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.getProviders(),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Get('/providers/:provider_id')
  @HttpCode(HttpStatus.OK)
  async getProvider(
    @Param('provider_id') provider_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.getProvider(provider_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Post('/providers')
  @UsePipes(new ZodValidationPipe(createProviderSchema))
  @HttpCode(HttpStatus.CREATED)
  async createProvider(
    @Body() body: CreateProviderDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.aiService.createProvider(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Patch('/providers')
  @UsePipes(new ZodValidationPipe(updateProviderSchema))
  @HttpCode(HttpStatus.OK)
  async updateProvider(
    @Body() body: UpdateProviderDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.updateProvider(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Patch('/providers/status')
  @UsePipes(new ZodValidationPipe(updateProviderStatusSchema))
  @HttpCode(HttpStatus.OK)
  async updateProviderStatus(
    @Body() body: UpdateProviderStatusDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.updateProviderStatus(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Delete('/providers/:provider_id')
  @HttpCode(HttpStatus.OK)
  async deleteProvider(
    @Param('provider_id') provider_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.deleteProvider(provider_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Get('/contexts')
  @HttpCode(HttpStatus.OK)
  async getContexts(@Query() query: AiQuery): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.getContextsFiltered(query),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Get('/contexts/:context_id')
  @HttpCode(HttpStatus.OK)
  async getContext(
    @Param('context_id') context_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.getContext(context_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Post('/contexts')
  @UsePipes(new ZodValidationPipe(createContextSchema))
  @HttpCode(HttpStatus.CREATED)
  async createContext(
    @Body() body: CreateContextDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.aiService.createContext(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Patch('/contexts')
  @UsePipes(new ZodValidationPipe(updateContextSchema))
  @HttpCode(HttpStatus.OK)
  async updateContext(
    @Body() body: UpdateContextDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.updateContext(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Delete('/contexts/:context_id')
  @HttpCode(HttpStatus.OK)
  async deleteContext(
    @Param('context_id') context_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.deleteContext(context_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(UserGuard)
  @Get('/chat/:thread_id')
  @HttpCode(HttpStatus.OK)
  async getChatByThreadId(
    @Req() req: Request,
    @Param('thread_id') thread_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.getChatByThreadId(
          req.user.user_id,
          thread_id,
        ),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(UserGuard)
  @Get('/chat')
  @HttpCode(HttpStatus.OK)
  async getChat(
    @Req() req: Request,
    @Query() query: { timezone: string },
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.getChat(req.user.user_id, query.timezone),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(UserGuard)
  @Post('/chat')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(userChatCompletionSchema))
  async chatCompletion(
    @Body() body: UserChatCompletionDto,
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.aiService.chatCompletion(req.user.user_id, body),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(UserGuard)
  @Post('/chat/streaming')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(userChatCompletionSchema))
  async chatStreaming(
    @Body() body: UserChatCompletionDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const limit = await this.aiService.checkLimitUser(
      req.user.user_id,
      body.timezone,
    );

    if (!limit.remaining) {
      res.write(
        'event: error\ndata: Maaf, kamu sudah mencapai batas penggunaan harianmu 😢\n\n',
      );
      res.end();
      return;
    }

    const query = await this.aiService.getMessages(req.user.user_id, body);

    if (typeof query === 'string') {
      res.write(query);
      res.end();
      return;
    }

    const stream = await this.aiService.chatStreaming(
      query.provider,
      query.messages,
    );

    if (typeof stream === 'string') {
      res.write(query);
      res.end();
      return;
    }

    let answer = '';
    let usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
      cost: number;
    } | null = null;

    try {
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);

          if (line.startsWith('data:')) {
            const data = line.replace(/^data:\s?/, '');

            if (data === '[DONE]') {
              res.write('data: [DONE]\n\n');

              await this.aiService.saveChat({
                user_id: req.user.user_id,
                input: body.input,
                answer,
                model: query.provider.model,
                prompt_tokens: usage?.prompt_tokens || 0,
                completion_tokens: usage?.completion_tokens || 0,
                total_tokens: usage?.total_tokens || 0,
                cost: usage?.cost || 0,
                img_url: body.img_url,
              });

              res.end();

              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;

              if (content) {
                answer += content;
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
              }

              if (parsed.usage) {
                usage = parsed.usage;
              }
            } catch (e) {
              // skip json parse error
            }
          }
        }
      }
    } catch (error) {
      console.error('Server Error: ', error);
      res.write(
        'event: error\ndata: Ups sepertinya ada masalah di server aku 😫\n\n',
      );
      res.end();
    }
  }

  @UseGuards(UserGuard)
  @Post('/chat/streaming/v2')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(userChatCompletionSchema))
  async chatStreamingV2(
    @Body() body: UserChatCompletionDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendError = (message: string) => {
      res.write(
        `event: error\ndata: ${JSON.stringify({ content: message })}\n\n`,
      );
      res.end();
    };

    try {
      if (
        !(await this.aiService.checkLimitUser(req.user.user_id, body.timezone))
          .remaining
      ) {
        sendError(
          'Kamu rajin banget sampe kuotanya kepake semua 🙌, coba lagi besok ya!',
        );
        return;
      }

      const provider = await this.aiService.getActiveProvider('paid');

      if (typeof provider === 'string') {
        sendError(provider);
        return;
      }

      const [prompt, chat_histories] = await Promise.all([
        this.aiService.getSystemPrompt(body.input),
        this.aiService.getChatHistories(req.user.user_id, body.timezone),
      ]);

      const messages: ModelMessage[] = [...prompt, ...chat_histories];

      if (body.img_url?.length) {
        const images = body.img_url.map((img) => ({
          type: 'image' as const,
          image: img,
        }));

        messages.push({
          role: 'user',
          content: [
            {
              type: 'text',
              text: body.input,
            },
            ...images,
          ],
        });
      } else {
        messages.push({
          role: 'user',
          content: [{ text: body.input, type: 'text' }],
        });
      }

      const openrouter = createOpenRouter({
        apiKey: provider.api_key,
      });

      const result = streamText({
        model: openrouter(provider.model, { usage: { include: true } }),
        messages,
        onError: (error) => {
          console.log('error in onError callback: ', error);
          sendError(
            'Server-nya lagi putus sama aku, sebentar ya aku ajak balikan dulu 😫',
          );
        },
        onFinish: (response) => {
          try {
            const usage = response.providerMetadata.openrouter
              .usage as OpenRouterUsageAccounting;

            this.aiService
              .saveChat({
                user_id: req.user.user_id,
                input: body.input,
                answer: response.text,
                model: provider.model,
                completion_tokens: usage.completionTokens,
                total_tokens: usage.totalTokens,
                cost: usage.cost,
                prompt_tokens: usage.promptTokens,
                img_url: body.img_url,
                thread_id: body.thread_id,
              })
              .catch((error) => {
                console.error('failed to save chat: ', error);
              });

            res.write('data: [DONE]\n\n');
            res.end();
          } catch (error) {
            console.error('error in onFinish callback: ', error);
            res.end();
          }
        },
      });

      for await (const text of result.textStream) {
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    } catch (error) {
      console.error('error in main stream function: ', error);
      sendError('Server aku lagi drama dulu guys, sabar sebentar ya! 😩');
      res.end();
    }
  }

  @UseGuards(PublicGuard)
  @Post('/chat/streaming/v3')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(userChatCompletionSchema))
  async chatStreamingV3(
    @Body() body: UserChatCompletionDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendError = (message: string) => {
      res.write(
        `event: error\ndata: ${JSON.stringify({ content: message })}\n\n`,
      );
      res.end();
    };

    try {
      if (!req.is_login) {
        const provider = await this.aiService.getActiveProvider('free');

        if (typeof provider === 'string') {
          sendError(provider);
          return;
        }

        const openrouter = createOpenRouter({
          apiKey: provider.api_key,
        });

        const result = streamText({
          model: openrouter(`${provider.model}${process.env.AI_PRESET}`),
          messages: body.messages.map((message) => {
            return {
              role: message.role,
              content: message.content,
            };
          }),
          onError: (error) => {
            console.log('error in onError callback: ', error);
            sendError(
              'Server-nya lagi putus sama aku, sebentar ya aku ajak balikan dulu 😫',
            );
          },
          onFinish: () => {
            res.write('data: [DONE]\n\n');
            res.end();
          },
        });

        for await (const text of result.textStream) {
          res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
        }

        return;
      }

      if (
        !(await this.aiService.checkLimitUser(req.user.user_id, body.timezone))
          .remaining
      ) {
        sendError(
          'Kamu rajin banget sampe kuotanya kepake semua 🙌, coba lagi besok ya!',
        );
        return;
      }

      const provider = await this.aiService.getActiveProvider('paid');

      if (typeof provider === 'string') {
        sendError(provider);
        return;
      }

      const chat_histories = await this.aiService.getChatHistories(
        req.user.user_id,
        body.timezone,
      );

      const messages: ModelMessage[] = [...chat_histories];

      if (body.img_url?.length) {
        messages.push({
          role: 'user',
          content: [
            {
              type: 'text',
              text: body.input,
            },
            ...body.img_url.map((img) => ({
              type: 'image' as const,
              image: img,
            })),
          ],
        });
      } else {
        messages.push({
          role: 'user',
          content: [{ text: body.input, type: 'text' }],
        });
      }

      const openrouter = createOpenRouter({
        apiKey: provider.api_key,
      });

      const result = streamText({
        model: openrouter(`${provider.model}${process.env.AI_PRESET}`, {
          usage: { include: true },
        }),
        messages,
        onError: (error) => {
          console.log('error in onError callback: ', error);
          sendError(
            'Server-nya lagi putus sama aku, sebentar ya aku ajak balikan dulu 😫',
          );
        },
        onFinish: (response) => {
          try {
            const usage = response.providerMetadata.openrouter
              .usage as OpenRouterUsageAccounting;

            this.aiService
              .saveChat({
                user_id: req.user.user_id,
                input: body.input,
                answer: response.text,
                model: provider.model,
                completion_tokens: usage.completionTokens,
                total_tokens: usage.totalTokens,
                cost: usage.cost,
                prompt_tokens: usage.promptTokens,
                img_url: body.img_url,
                thread_id: body.thread_id,
              })
              .catch((error) => {
                console.error('failed to save chat: ', error);
              });

            res.write('data: [DONE]\n\n');
            res.end();
          } catch (error) {
            console.error('error in onFinish callback: ', error);
            res.end();
          }
        },
      });

      for await (const text of result.textStream) {
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }

      return;
    } catch (error) {
      console.error('error in main stream function: ', error);
      sendError('Server aku lagi drama dulu guys, sabar sebentar ya! 😩');
      res.end();
    }
  }

  @UseGuards(UserGuard)
  @Post('/chat/summarize')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(userChatCompletionSchema))
  async summarizeChat(
    @Body() body: UserChatCompletionDto,
    @Res() res: Response,
  ) {
    try {
      if (!body.thread_id || !body.messages?.length) {
        throw new BadRequestException('Thread ID atau messages harus ada');
      }

      if (!(await this.aiService.checkThread(body.thread_id))) {
        throw new NotFoundException('Thread tidak ditemukan');
      }

      const provider = await this.aiService.getActiveProvider('paid');

      if (typeof provider === 'string') {
        return;
      }

      const openrouter = createOpenRouter({
        apiKey: provider.api_key,
      });

      const response = streamText({
        model: openrouter(provider.model),
        system:
          'Ringkas percakapan ini menjadi 4 sampai 6 kata. Gunakan hanya huruf alfabet. Jangan gunakan tanda baca, emoji, karakter unik, atau simbol apapun.',
        messages: body.messages.map((message) => {
          return {
            role: message.role,
            content: message.content,
          };
        }),
        onFinish: async (response) => {
          try {
            await this.aiService.updateTitleThread(
              body.thread_id,
              response.text,
            );

            res.json({
              success: true,
              status_code: HttpStatus.CREATED,
              data: {
                title: response.text,
              },
            });
          } catch (error) {
            console.error('error in onFinish callback: ', error);
            res.json({
              success: false,
              status_code: HttpStatus.INTERNAL_SERVER_ERROR,
              errors: {
                ...error,
              },
            });
          }
        },
      });

      response.consumeStream();
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(UserGuard)
  @Post('/chat/images')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FilesInterceptor('images'))
  async uploadChatImage(
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 5 * 1024 * 1024,
            message: 'Ukuran file terlalu besar',
          }),
          new FileTypeValidator({
            fileType: /\/(jpeg|jpg|png)$/,
          }),
        ],
      }),
    )
    files: Array<Express.Multer.File>,
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      const data = [];

      for (const file of files) {
        data.push({
          url: await this.storage.uploadFile({
            buffer: file.buffer,
            key: `chat/${Date.now()}-${req.user.user_id}-${file.originalname}`,
            mimetype: file.mimetype,
          }),
        });
      }

      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data,
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(UserGuard)
  @Delete('/chat/images')
  @HttpCode(HttpStatus.OK)
  async deleteChatImage(@Query('key') key: string): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.deleteChatImage(key),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Get('/chat/logs')
  @HttpCode(HttpStatus.OK)
  async getChatLogs(@Query() query: AiQuery): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.getChatLogsFiltered(query),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(UserGuard)
  @Get('/limits/check')
  @HttpCode(HttpStatus.OK)
  async checkLimitUser(@Req() req: Request): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.checkLimitUser(req.user.user_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Get('/limits')
  @HttpCode(HttpStatus.OK)
  async getAiLimits(): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.getAiLimits(),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Post('/limits')
  @UsePipes(new ZodValidationPipe(createAiLimit))
  @HttpCode(HttpStatus.CREATED)
  async createAiLimit(
    @Body() body: CreateAiLimitDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.aiService.createAiLimit(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Patch('/limits')
  @UsePipes(new ZodValidationPipe(updateAiLimit))
  @HttpCode(HttpStatus.OK)
  async updateAiLimit(
    @Body() body: UpdateAiLimitDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.updateAiLimit(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Delete('/limits/:limit_id')
  @HttpCode(HttpStatus.OK)
  async deleteAiLimit(
    @Param('limit_id') limit_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.deleteAiLimit(limit_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Get('/limits/users')
  @HttpCode(HttpStatus.OK)
  async getAiLimitUsers(@Query() query: AiQuery): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.getAiLimitUsersFiltered(query),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Post('/limits/users')
  @UsePipes(new ZodValidationPipe(createUserAiLimit))
  @HttpCode(HttpStatus.CREATED)
  async createUserAiLimit(
    @Body() body: CreateUserAiLimitDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.aiService.createUserAiLimit(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Patch('/limits/users')
  @UsePipes(new ZodValidationPipe(updateUserAiLimit))
  @HttpCode(HttpStatus.OK)
  async updateUserAiLimit(
    @Body() body: UpdateUserAiLimitDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.updateUserAiLimit(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Delete('/limits/users/:user_id')
  @HttpCode(HttpStatus.OK)
  async deleteUserAiLimit(
    @Param('user_id') user_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.deleteUserAiLimit(user_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Get('/prompts')
  @HttpCode(HttpStatus.OK)
  async getPrompts(): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.getPrompts(),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Post('/prompts/upsert')
  @UsePipes(new ZodValidationPipe(upsertPromptSchema))
  @HttpCode(HttpStatus.CREATED)
  async upsertPrompt(@Body() body: UpsertPromptDto): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.aiService.upsertPrompt(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(UserGuard)
  @Get('/threads')
  @HttpCode(HttpStatus.OK)
  async getThreads(
    @Query('archive') archive: string,
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.getThreads(
          req.user.user_id,
          parseInt(archive),
        ),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(UserGuard)
  @Post('/threads')
  @HttpCode(HttpStatus.CREATED)
  async createThread(@Req() req: Request): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.aiService.createThread(req.user.user_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(UserGuard)
  @Patch('/threads')
  @UsePipes(new ZodValidationPipe(updateThreadSchema))
  @HttpCode(HttpStatus.OK)
  async updateThread(
    @Body() body: UpdateThreadDto,
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.updateThread(body, req.user.user_id),
      };
    } catch (error) {
      throw error;
    }
  }
}
