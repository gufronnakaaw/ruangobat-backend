import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../utils/services/prisma.service';
import { parseSortQuery } from '../utils/string.util';
import { CreateTopicDto, TopicQuery, UpdateTopicDto } from './topics.dto';

@Injectable()
export class TopicsService {
  constructor(private prisma: PrismaService) {}

  async getAllTopics() {
    const topics = await this.prisma.topic.findMany({
      orderBy: [{ first_letter: 'asc' }, { name: 'asc' }],
      select: { first_letter: true, name: true },
    });

    const filtered = topics.filter(
      (topic) => topic.name.toLowerCase() !== 'lainnya',
    );

    const map = new Map<string, { topic: string; items: { name: string }[] }>();

    for (const topic of filtered) {
      if (!map.has(topic.first_letter)) {
        map.set(topic.first_letter, {
          topic: topic.first_letter,
          items: [],
        });
      }
      map.get(topic.first_letter)!.items.push({ name: topic.name });
    }

    return Array.from(map.values());
  }

  async createTopic(body: CreateTopicDto, by: string) {
    return this.prisma.topic.create({
      data: {
        name: body.name,
        first_letter: body.name.charAt(0).toUpperCase(),
        created_by: by,
        updated_by: by,
      },
      select: {
        topic_id: true,
      },
    });
  }

  async getTopicsFiltered(query: TopicQuery) {
    const default_page = 1;
    const take = 10;
    const page = Number(query.page) || default_page;
    const skip = (page - 1) * take;

    const where: any = {};
    if (query.q) {
      where.name = { contains: query.q };
    }

    const [total_topics, topics] = await this.prisma.$transaction([
      this.prisma.topic.count({ where }),
      this.prisma.topic.findMany({
        where,
        select: {
          topic_id: true,
          name: true,
          first_letter: true,
          created_at: true,
          _count: {
            select: {
              articles: true,
            },
          },
        },
        orderBy: query.sort
          ? parseSortQuery(query.sort, ['created_at', 'name'])
          : { created_at: 'desc' },
        take,
        skip,
      }),
    ]);

    return {
      topics: topics.map((topic) => {
        const { _count, ...rest } = topic;

        return {
          ...rest,
          can_delete: Boolean(!_count.articles),
        };
      }),
      page,
      total_topics,
      total_pages: Math.ceil(total_topics / take),
    };
  }

  async updateTopic(body: UpdateTopicDto, by: string) {
    const topic = await this.prisma.topic.findUnique({
      where: { topic_id: body.topic_id },
      select: { topic_id: true, first_letter: true },
    });

    if (!topic) throw new NotFoundException('Topic tidak ditemukan');

    let first_letter = topic.first_letter;

    if (body.name) {
      first_letter = body.name.charAt(0).toUpperCase();
    }

    return this.prisma.topic.update({
      where: { topic_id: body.topic_id },
      data: {
        name: body.name,
        first_letter,
        updated_by: by,
      },
      select: {
        topic_id: true,
      },
    });
  }

  async deleteTopic(topic_id: string) {
    const topic = await this.prisma.topic.findUnique({ where: { topic_id } });

    if (!topic) throw new NotFoundException('Topic tidak ditemukan');

    return this.prisma.topic.delete({
      where: { topic_id },
      select: { topic_id: true },
    });
  }
}
