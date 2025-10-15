import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../utils/services/prisma.service';
import { StorageService } from '../utils/services/storage.service';
import { parseSortQuery, slug } from '../utils/string.util';
import { CreateEventDto, EventsQuery, UpdateEventDto } from './events.dto';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async getEvents(query: EventsQuery) {
    const default_page = 1;
    const take = 9;
    const page = Number(query.page) || default_page;
    const skip = (page - 1) * take;

    const where: any = {};

    if (query.filter) {
      where.province = query.filter;
    }

    if (query.q) {
      where.OR = [
        { title: { contains: query.q } },
        { slug: { contains: query.q } },
        { university_name: { contains: query.q } },
      ];
    }

    const [total_events, events] = await this.prisma.$transaction([
      this.prisma.universityEvent.count({
        where,
      }),
      this.prisma.universityEvent.findMany({
        where,
        take,
        skip,
        orderBy: query.sort
          ? parseSortQuery(query.sort, ['created_at', 'title'])
          : { created_at: 'desc' },
        select: {
          event_id: true,
          title: true,
          slug: true,
          province: true,
          content: true,
          img_url: true,
          registration_date: true,
          university_name: true,
          created_at: true,
          created_by: true,
        },
      }),
    ]);

    return {
      events,
      page,
      total_events,
      total_pages: Math.ceil(total_events / take),
    };
  }

  getEvent(id_or_slug: string) {
    return this.prisma.universityEvent.findFirst({
      where: {
        OR: [{ event_id: id_or_slug }, { slug: id_or_slug }],
      },
      select: {
        event_id: true,
        title: true,
        slug: true,
        img_url: true,
        content: true,
        registration_date: true,
        university_name: true,
        province: true,
        created_at: true,
        created_by: true,
      },
    });
  }

  async createEvent(
    body: CreateEventDto,
    file: Express.Multer.File,
    by: string,
  ) {
    const key = `events/${Date.now()}-${file.originalname}`;

    const url = await this.storage.uploadFile({
      buffer: file.buffer,
      key,
      mimetype: file.mimetype,
    });

    return this.prisma.universityEvent.create({
      data: {
        title: body.title,
        slug: slug(body.title),
        content: body.content,
        university_name: body.university_name,
        registration_date: body.registration_date,
        img_key: key,
        img_url: url,
        created_by: by,
        updated_by: by,
        province: body.province,
      },
      select: {
        event_id: true,
      },
    });
  }

  async updateEvent(
    body: UpdateEventDto,
    file: Express.Multer.File,
    by: string,
  ) {
    const event = await this.prisma.universityEvent.findFirst({
      where: {
        event_id: body.event_id,
      },
      select: {
        img_key: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Event tidak ditemukan');
    }

    let key = '';
    let url = '';

    if (file) {
      key = `events/${Date.now()}-${file.originalname}`;
      url = await this.storage.uploadFile({
        buffer: file.buffer,
        key,
        mimetype: file.mimetype,
      });
      await this.storage.deleteFile(event.img_key);
    }

    return this.prisma.universityEvent.update({
      where: {
        event_id: body.event_id,
      },
      data: {
        title: body.title,
        slug: body.title ? slug(body.title) : undefined,
        content: body.content,
        university_name: body.university_name,
        registration_date: body.registration_date,
        img_key: key ? key : undefined,
        img_url: url ? url : undefined,
        updated_by: by,
        province: body.province,
      },
      select: {
        event_id: true,
      },
    });
  }

  async deleteEvent(event_id: string) {
    const event = await this.prisma.universityEvent.findFirst({
      where: { event_id },
      select: { event_id: true },
    });

    if (!event) {
      throw new NotFoundException('Event tidak ditemukan');
    }

    return this.prisma.universityEvent.delete({
      where: { event_id },
      select: { event_id: true },
    });
  }
}
