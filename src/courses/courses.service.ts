import { Injectable, NotFoundException } from '@nestjs/common';
import ShortUniqueId from 'short-unique-id';
import { PrismaService } from '../utils/services/prisma.service';
import { StorageService } from '../utils/services/storage.service';
import { parseIsActive, parseSortQuery, slug } from '../utils/string.util';
import {
  CoursesQuery,
  CreateContentDto,
  CreateCourseDto,
  CreateSegmentDto,
  CreateTestDto,
  UpdateContentDto,
  UpdateCourseDto,
  UpdateSegmentDto,
} from './courses.dto';

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async getCourses(
    cat_or_sub: string,
    type: 'videocourse' | 'apotekerclass' | 'videoukmppai',
    query: CoursesQuery,
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
          name: true,
          slug: true,
          img_url: true,
          type: true,
          course: {
            where: {
              is_active: query.filter === 'inactive' ? false : true,
            },
            select: {
              course_id: true,
              title: true,
              slug: true,
              thumbnail_url: true,
              is_active: true,
              segment: {
                select: {
                  content: {
                    select: {
                      content_type: true,
                    },
                  },
                },
              },
            },
            orderBy: query.sort
              ? parseSortQuery(query.sort, ['created_at', 'title'])
              : { created_at: 'desc' },
          },
        },
      })
      .then((result) => {
        if (!result) return {};

        const { course, ...rest } = result;

        return {
          ...rest,
          courses: course.map((item) => {
            const { segment, ...course_data } = item;

            const segments = segment.flatMap((seg) => seg.content);

            const total_videos = segments.filter(
              (cont) => cont.content_type === 'video',
            ).length;
            const total_tests = segments.filter(
              (cont) => cont.content_type === 'test',
            ).length;

            return {
              ...course_data,
              total_videos,
              total_tests,
            };
          }),
        };
      });
  }

  async getCourse(id_or_slug: string) {
    return this.prisma.course
      .findFirst({
        where: {
          OR: [
            {
              course_id: id_or_slug,
            },
            {
              slug: id_or_slug,
            },
          ],
        },
        select: {
          course_id: true,
          title: true,
          slug: true,
          thumbnail_url: true,
          preview_url: true,
          description: true,
          is_active: true,
          segment: {
            select: {
              segment_id: true,
              title: true,
              number: true,
              is_active: true,
              content: {
                select: {
                  content_id: true,
                  content_type: true,
                  title: true,
                  video_url: true,
                  video_note_url: true,
                  video_note: true,
                  test_type: true,
                },
                orderBy: {
                  number: 'asc',
                },
              },
            },
            orderBy: {
              number: 'asc',
            },
          },
        },
      })
      .then((result) => {
        if (!result) return {};

        const { segment, ...course_data } = result;

        const segments = segment.map((segment) => {
          const { content, ...segment_data } = segment;

          const pre = content.find(
            (item) => item.content_type === 'test' && item.test_type === 'pre',
          );

          const videos = content.filter(
            (item) => item.content_type === 'video',
          );

          const post = content.find(
            (item) => item.content_type === 'test' && item.test_type === 'post',
          );

          return {
            ...segment_data,
            contents: [
              ...(pre ? [pre] : []),
              ...videos,
              ...(post ? [post] : []),
            ],
          };
        });

        return {
          ...course_data,
          segments,
        };
      });
  }

  async createCourse(
    body: CreateCourseDto,
    file: Express.Multer.File,
  ): Promise<any> {
    const key = `courses/${Date.now()}-${file.originalname}`;

    return this.prisma.course.create({
      data: {
        category_id: body.category_id,
        sub_category_id: body.sub_category_id,
        type: body.type,
        slug: slug(body.title),
        title: body.title,
        description: body.description,
        thumbnail_url: await this.storage.uploadFile({
          buffer: file.buffer,
          key,
          mimetype: file.mimetype,
        }),
        thumbnail_key: key,
        preview_url: body.preview_url,
        created_by: body.by,
        updated_by: body.by,
      },
      select: {
        course_id: true,
      },
    });
  }

  async updateCourse(
    body: UpdateCourseDto,
    file: Express.Multer.File,
  ): Promise<any> {
    const course = await this.prisma.course.findUnique({
      where: { course_id: body.course_id },
      select: { thumbnail_key: true },
    });

    if (!course) {
      throw new NotFoundException('Kelas tidak ditemukan');
    }

    let key = '';
    let url = '';

    if (file) {
      await this.storage.deleteFile(course.thumbnail_key);

      key += `courses/${Date.now()}-${file.originalname}`;

      url += await this.storage.uploadFile({
        buffer: file.buffer,
        key,
        mimetype: file.mimetype,
      });
    }

    const [updated_course] = await this.prisma.$transaction([
      this.prisma.course.update({
        where: { course_id: body.course_id },
        data: {
          slug: body.title ? slug(body.title) : undefined,
          title: body.title,
          description: body.description,
          thumbnail_url: url ? url : undefined,
          thumbnail_key: key ? key : undefined,
          preview_url: body.preview_url,
          created_by: body.by,
          updated_by: body.by,
          is_active: parseIsActive(body.is_active),
        },
        select: {
          course_id: true,
        },
      }),
      this.prisma.segment.updateMany({
        where: { course_id: body.course_id },
        data: {
          is_active: parseIsActive(body.is_active),
          updated_by: body.by,
        },
      }),
      this.prisma.content.updateMany({
        where: { segment: { course_id: body.course_id } },
        data: {
          is_active: parseIsActive(body.is_active),
          updated_by: body.by,
        },
      }),
    ]);

    return updated_course;
  }

  async createSegment(body: CreateSegmentDto) {
    const segment = await this.prisma.segment.findFirst({
      where: {
        course_id: body.course_id,
      },
      select: {
        number: true,
      },
      orderBy: {
        number: 'desc',
      },
    });

    return this.prisma.segment.create({
      data: {
        course_id: body.course_id,
        title: body.title,
        number: segment ? segment.number + 1 : 1,
        created_by: body.by,
        updated_by: body.by,
      },
      select: {
        segment_id: true,
      },
    });
  }

  async updateSegment(body: UpdateSegmentDto) {
    if (
      !(await this.prisma.segment.count({
        where: { segment_id: body.segment_id },
      }))
    ) {
      throw new NotFoundException('Segment tidak ditemukan');
    }

    return this.prisma.segment.update({
      where: { segment_id: body.segment_id },
      data: {
        title: body.title,
        is_active: parseIsActive(body.is_active),
        updated_by: body.by,
      },
      select: {
        segment_id: true,
      },
    });
  }

  async createContent(body: CreateContentDto) {
    const [segment, content] = await this.prisma.$transaction([
      this.prisma.segment.count({
        where: { segment_id: body.segment_id },
      }),
      this.prisma.content.findFirst({
        where: { segment_id: body.segment_id },
        select: {
          number: true,
        },
        orderBy: {
          number: 'desc',
        },
      }),
    ]);

    if (!segment) {
      throw new NotFoundException('Segment tidak ditemukan');
    }

    const last_number = content ? content.number : 0;

    const data = body.contents.map((content, index) => ({
      segment_id: body.segment_id,
      title: content.title,
      number: last_number + index + 1,
      video_url: content.video_url,
      video_note_url: content.video_note_url,
      video_note: content.video_note,
      content_type: content.content_type,
      test_type: content.test_type,
      created_by: body.by,
      updated_by: body.by,
    }));

    return this.prisma.content.createMany({
      data,
    });
  }

  async updateContent(body: UpdateContentDto) {
    if (
      !(await this.prisma.content.count({
        where: { content_id: body.content_id },
      }))
    ) {
      throw new NotFoundException('Konten tidak ditemukan');
    }

    return this.prisma.content.update({
      where: { content_id: body.content_id },
      data: {
        title: body.title,
        video_url: body.video_url,
        video_note_url: body.video_note_url,
        video_note: body.video_note,
        is_active: parseIsActive(body.is_active),
        updated_by: body.by,
      },
      select: {
        content_id: true,
      },
    });
  }

  async createTest(body: CreateTestDto) {
    const [segment, content] = await this.prisma.$transaction([
      this.prisma.segment.count({
        where: { segment_id: body.segment_id },
      }),
      this.prisma.content.findFirst({
        where: { segment_id: body.segment_id },
        select: {
          number: true,
        },
        orderBy: {
          number: 'desc',
        },
      }),
    ]);

    if (!segment) {
      throw new NotFoundException('Segment tidak ditemukan');
    }
    const last_number = content ? content.number : 0;
    const uid = new ShortUniqueId({ length: 12 });

    const create = await this.prisma.content.create({
      data: {
        segment_id: body.segment_id,
        title: body.title,
        number: last_number + 1,
        content_type: 'test',
        test_type: body.test_type,
        created_by: body.by,
        updated_by: body.by,
      },
      select: {
        content_id: true,
      },
    });

    const promises = [];

    for (const [index, question] of body.questions.entries()) {
      promises.push(
        this.prisma.assessmentQuestion.create({
          data: {
            content_id: create.content_id,
            assq_id: `ROQ${uid.rnd().toUpperCase()}`,
            text: question.text,
            explanation: question.explanation,
            url: question.url,
            type: question.type,
            number: question.number ? question.number : index + 1,
            created_by: body.by,
            updated_by: body.by,
            option: {
              createMany: {
                data: question.options.map((option) => ({
                  asso_id: `ROO${uid.rnd().toUpperCase()}`,
                  text: option.text,
                  is_correct: option.is_correct,
                  created_by: body.by,
                  updated_by: body.by,
                })),
              },
            },
          },
        }),
      );
    }

    await Promise.all(promises);

    return create;
  }
}
