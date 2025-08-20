import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../utils/services/prisma.service';
import { StorageService } from '../utils/services/storage.service';
import { parseIsActive, parseSortQuery } from '../utils/string.util';
import { AdsQuery, CreateAdsDto, UpdateAdsDto } from './ads.dto';

@Injectable()
export class AdsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async createAds(body: CreateAdsDto, file: Express.Multer.File, by: string) {
    const key = `ads/${Date.now()}-${file.originalname}`;
    const url = await this.storage.uploadFile({
      key,
      buffer: file.buffer,
      mimetype: file.mimetype,
    });

    return this.prisma.ad.create({
      data: {
        type: body.type,
        title: body.title,
        link: body.link,
        img_key: key,
        img_url: url,
        created_by: by,
        updated_by: by,
      },
      select: {
        ad_id: true,
      },
    });
  }

  async getAdsFiltered(query: AdsQuery) {
    const default_page = 1;
    const take = 10;
    const page = Number(query.page) || default_page;
    const skip = (page - 1) * take;

    const where: any = {};
    where.is_active = query.filter === 'inactive' ? false : true;

    if (query.filter === 'homepage' || query.filter === 'detailpage') {
      where.type = query.filter;
    }

    const [total_ads, ads] = await this.prisma.$transaction([
      this.prisma.ad.count({ where }),
      this.prisma.ad.findMany({
        where,
        select: {
          ad_id: true,
          title: true,
          type: true,
          img_url: true,
          link: true,
          is_active: true,
          created_at: true,
        },
        orderBy: query.sort
          ? parseSortQuery(query.sort, ['created_at'])
          : { created_at: 'desc' },
        take,
        skip,
      }),
    ]);

    return {
      ads,
      page,
      total_ads,
      total_pages: Math.ceil(total_ads / take),
    };
  }

  async updateAds(body: UpdateAdsDto, file: Express.Multer.File, by: string) {
    const ads = await this.prisma.ad.findFirst({
      where: { ad_id: body.ad_id },
      select: {
        ad_id: true,
        img_key: true,
      },
    });

    if (!ads) throw new NotFoundException('Ads tidak ditemukan');

    let url = '';
    let key = '';

    if (file) {
      key = `ads/${Date.now()}-${file.originalname}`;
      url = await this.storage.uploadFile({
        key,
        buffer: file.buffer,
        mimetype: file.mimetype,
      });
      await this.storage.deleteFile(ads.img_key);
    }

    return this.prisma.ad.update({
      where: { ad_id: body.ad_id },
      data: {
        title: body.title,
        link: body.link,
        img_key: key ? key : undefined,
        img_url: url ? url : undefined,
        updated_by: by,
        is_active: parseIsActive(body.is_active),
      },
      select: {
        ad_id: true,
      },
    });
  }

  async deleteAds(ad_id: string) {
    const ads = await this.prisma.ad.findUnique({ where: { ad_id } });
    if (!ads) throw new NotFoundException('Ads tidak ditemukan');

    return this.prisma.ad.delete({
      where: { ad_id },
      select: { ad_id: true },
    });
  }
}
