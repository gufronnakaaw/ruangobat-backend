import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../utils/services/prisma.service';
import { StorageService } from '../utils/services/storage.service';
import { parseIsActive } from '../utils/string.util';
import { CreateCardDto, UpdateCardDto } from './cards.dto';

@Injectable()
export class CardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async getCards(
    cat_or_sub: string,
    type: 'videocourse' | 'apotekerclass' | 'videoukmppai',
  ) {
    if (!['videocourse', 'apotekerclass', 'videoukmppai'].includes(type)) {
      return [];
    }

    const where: any = { type };

    const OR: {
      category_id?: string;
      sub_category_id?: string;
      slug?: string;
    }[] = [];

    let model: 'category' | 'subCategory' | '' = '';

    if (type === 'apotekerclass') {
      model += 'category';
      OR.push({ category_id: cat_or_sub }, { slug: cat_or_sub });
    } else {
      model += 'subCategory';
      OR.push({ sub_category_id: cat_or_sub }, { slug: cat_or_sub });
    }

    where.OR = OR;

    return this.prisma[model]
      .findFirst({
        where,
        select: {
          ...(type === 'apotekerclass'
            ? { category_id: true }
            : { sub_category_id: true }),
          name: true,
          slug: true,
          img_url: true,
          type: true,
          card: {
            select: {
              card_id: true,
              text: true,
              type: true,
              url: true,
            },
          },
        },
      })
      .then((result) => {
        if (!result) return {};

        const { card, ...rest } = result;

        return {
          ...rest,
          cards: card,
        };
      });
  }

  async createCard(body: CreateCardDto, files: Express.Multer.File[]) {
    if (body.type === 'text') {
      if (!body.text) {
        throw new BadRequestException('Wajib mengisi text');
      }

      await this.prisma.card.create({
        data: {
          category_id: body.category_id,
          sub_category_id: body.sub_category_id,
          text: body.text,
          type: body.type,
          created_by: body.by,
          updated_by: body.by,
        },
      });

      return;
    }

    if ((body.type === 'image' || body.type === 'document') && !files.length) {
      throw new BadRequestException('Minimal 1 file');
    }

    const promises = [];

    for (const file of files) {
      const key = `cards/${file.originalname}`;
      const url = await this.storage.uploadFile({
        buffer: file.buffer,
        key,
        mimetype: file.mimetype,
      });

      promises.push(
        this.prisma.card.create({
          data: {
            category_id: body.category_id,
            sub_category_id: body.sub_category_id,
            url,
            key,
            type: body.type,
            created_by: body.by,
            updated_by: body.by,
          },
        }),
      );
    }

    await this.prisma.$transaction(promises);
  }

  async updateCard(body: UpdateCardDto, file: Express.Multer.File) {
    const card = await this.prisma.card.findUnique({
      where: { card_id: body.card_id },
      select: { key: true },
    });

    if (!card) {
      throw new BadRequestException('Flashcard tidak ditemukan');
    }

    if (body.type === 'text') {
      if (card.key) {
        await this.storage.deleteFile(card.key);
      }

      await this.prisma.card.update({
        where: { card_id: body.card_id },
        data: {
          text: body.text,
          type: body.type,
          url: null,
          key: null,
          is_active: parseIsActive(body.is_active),
          updated_by: body.by,
        },
      });

      return;
    }

    const key = `cards/${file.originalname}`;

    if (card.key) {
      await this.storage.deleteFile(card.key);
    }

    await this.prisma.card.update({
      where: { card_id: body.card_id },
      data: {
        url: file
          ? await this.storage.uploadFile({
              buffer: file.buffer,
              key,
              mimetype: file.mimetype,
            })
          : undefined,
        key: file ? key : undefined,
        text: null,
        type: body.type,
        is_active: parseIsActive(body.is_active),
        updated_by: body.by,
      },
    });
  }

  async deleteCard(card_id: string) {
    const card = await this.prisma.card.findUnique({
      where: { card_id },
      select: { key: true },
    });

    if (!card) {
      throw new BadRequestException('Flashcard tidak ditemukan');
    }

    if (card.key) {
      await this.storage.deleteFile(card.key);
    }

    return this.prisma.card.delete({
      where: { card_id },
      select: { card_id: true },
    });
  }
}
