import { Injectable, NotFoundException } from '@nestjs/common';
import { random } from 'lodash';
import ShortUniqueId from 'short-unique-id';
import { PrismaService } from '../utils/services/prisma.service';
import { parseIsActive, parseSortQuery } from '../utils/string.util';
import { CreateQuizDto, QuizzesQuery, UpdateQuizDto } from './quizzes.dto';

@Injectable()
export class QuizzesService {
  constructor(private readonly prisma: PrismaService) {}

  async getQuizzes(
    cat_or_sub: string,
    type: 'apotekerclass' | 'videocourse' | 'videoukmppai',
    variant: 'quiz' | 'tryout',
    query: QuizzesQuery,
  ) {
    if (
      !['apotekerclass', 'videocourse', 'videoukmppai'].includes(type) ||
      !['quiz', 'tryout'].includes(variant)
    ) {
      return [];
    }

    const default_page = 1;
    const take = 10;
    const page = Number(query.page) || default_page;
    const skip = (page - 1) * take;

    const where_main: any = {};

    let model: 'category' | 'subCategory' | '' = '';
    let field: 'category' | 'sub_category' | '' = '';

    if (type === 'apotekerclass') {
      model += 'category';
      field = 'category';
      where_main.OR = [{ category_id: cat_or_sub }, { slug: cat_or_sub }];
    } else {
      model += 'subCategory';
      field = 'sub_category';
      where_main.OR = [{ sub_category_id: cat_or_sub }, { slug: cat_or_sub }];
    }

    const where_quiz: any = {
      ass_type: type,
      variant,
    };

    if (query.filter === 'inactive') {
      where_quiz.is_active = false;
    } else {
      where_quiz.is_active = true;
    }

    if (query.q) {
      where_quiz.OR = [
        { title: { contains: query.q } },
        { ass_id: { contains: query.q } },
      ];
    }

    const [total_quizzes, quizzes] = await this.prisma.$transaction([
      this.prisma.assessment.count({
        where: {
          ...where_quiz,
          [field]: {
            OR: [{ [field + '_id']: cat_or_sub }, { slug: cat_or_sub }],
          },
        },
      }),
      this.prisma[model].findFirst({
        where: where_main,
        select: {
          ...(type === 'apotekerclass'
            ? { category_id: true }
            : { sub_category_id: true }),
          name: true,
          slug: true,
          img_url: true,
          type: true,
          assessment: {
            where: where_quiz,
            select: {
              ass_id: true,
              description: true,
              title: true,
              variant: true,
              _count: {
                select: {
                  question: true,
                },
              },
            },
            orderBy: query.sort
              ? parseSortQuery(query.sort, ['created_at', 'title'])
              : { created_at: 'desc' },
            take,
            skip,
          },
        },
      }),
    ]);

    if (!quizzes) return {};

    const { assessment, ...rest } = quizzes;

    return {
      ...rest,
      quizzes: assessment.length
        ? assessment.map(({ _count, ...rest }) => ({
            ...rest,
            total_questions: _count.question,
          }))
        : [],
      page,
      total_quizzes: total_quizzes,
      total_pages: Math.ceil(total_quizzes / take),
    };
  }

  async getQuiz(ass_id: string, query: QuizzesQuery) {
    const default_page = 1;
    const take = 20;
    const page = Number(query.page) || default_page;
    const skip = (page - 1) * take;

    const [total_questions, quiz] = await this.prisma.$transaction([
      this.prisma.assessmentQuestion.count({ where: { ass_id } }),
      this.prisma.assessment.findUnique({
        where: { ass_id },
        select: {
          ass_id: true,
          title: true,
          description: true,
          question: {
            select: {
              assq_id: true,
              number: true,
              text: true,
              explanation: true,
              type: true,
              option: {
                select: {
                  asso_id: true,
                  text: true,
                  is_correct: true,
                },
              },
              _count: {
                select: {
                  resultdetail: true,
                },
              },
            },
            orderBy: { number: 'asc' },
            take,
            skip,
          },
        },
      }),
    ]);

    const { question, ...rest } = quiz;

    return {
      ...rest,
      question: question.map((item) => {
        const { _count, ...question_data } = item;

        return {
          ...question_data,
          can_delete: Boolean(!_count.resultdetail),
        };
      }),
      page,
      total_questions,
      total_pages: Math.ceil(total_questions / take),
    };
  }

  async createQuiz(body: CreateQuizDto) {
    const ass_id = `ROASS${random(10000000, 99999999)}`;
    const uid = new ShortUniqueId({ length: 12 });

    const promises = [];

    for (const [index, question] of body.questions.entries()) {
      promises.push(
        this.prisma.assessmentQuestion.create({
          data: {
            ass_id,
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

    await this.prisma.assessment.create({
      data: {
        ass_id,
        category_id: body.category_id,
        sub_category_id: body.sub_category_id,
        title: body.title,
        description: body.description,
        ass_type: body.type,
        created_by: body.by,
        updated_by: body.by,
        variant: body.variant,
      },
    });

    await Promise.all(promises);

    return {
      ass_id,
    };
  }

  async updateQuiz(body: UpdateQuizDto) {
    const quiz = await this.prisma.assessment.count({
      where: { ass_id: body.ass_id },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz tidak ditemukan');
    }

    if (body.update_type === 'update_quiz') {
      return this.prisma.assessment.update({
        where: {
          ass_id: body.ass_id,
        },
        data: {
          title: body.title,
          description: body.description,
          updated_by: body.by,
          is_active: parseIsActive(body.is_active),
        },
        select: {
          ass_id: true,
        },
      });
    }

    if (body.update_type == 'update_question') {
      const promises = [];

      promises.push(
        this.prisma.assessmentQuestion.update({
          where: {
            assq_id: body.questions[0].assq_id,
          },
          data: {
            text: body.questions[0].text,
            explanation: body.questions[0].explanation,
            updated_by: body.by,
          },
        }),
      );

      for (const option of body.questions[0].options) {
        promises.push(
          this.prisma.assessmentOption.updateMany({
            where: {
              assq_id: body.questions[0].assq_id,
              asso_id: option.asso_id,
            },
            data: {
              text: option.text,
              is_correct: option.is_correct,
              updated_by: body.by,
            },
          }),
        );
      }

      await Promise.all(promises);

      return body.questions[0];
    }

    if (body.update_type == 'add_question') {
      const uid = new ShortUniqueId({ length: 12 });
      const count = await this.prisma.assessmentQuestion.count({
        where: { ass_id: body.ass_id },
      });

      const question = body.questions[0];

      return this.prisma.assessmentQuestion.create({
        data: {
          assq_id: `ROQ${uid.rnd().toUpperCase()}`,
          ass_id: body.ass_id,
          type: question.type,
          url: question.url,
          explanation: question.explanation,
          number: count + 1,
          text: question.text,
          created_by: body.by,
          updated_by: body.by,
          option: {
            createMany: {
              data: question.options.map((option) => {
                return {
                  asso_id: `ROO${uid.rnd().toUpperCase()}`,
                  text: option.text,
                  is_correct: option.is_correct,
                  created_by: body.by,
                  updated_by: body.by,
                };
              }),
            },
          },
        },
      });
    }
  }

  async deleteQuestion(params: { ass_id: string; assq_id: string }) {
    const quiz = await this.prisma.assessmentQuestion.count({
      where: { ass_id: params.ass_id, assq_id: params.assq_id },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz atau question tidak ditemukan');
    }

    const [, questions] = await this.prisma.$transaction([
      this.prisma.assessmentQuestion.delete({
        where: { ass_id: params.ass_id, assq_id: params.assq_id },
      }),
      this.prisma.assessmentQuestion.findMany({
        where: { ass_id: params.ass_id },
        select: {
          assq_id: true,
        },
      }),
    ]);

    const promises = [];

    for (const [index, question] of questions.entries()) {
      promises.push(
        this.prisma.assessmentQuestion.update({
          where: {
            ass_id: params.ass_id,
            assq_id: question.assq_id,
          },
          data: {
            number: index + 1,
          },
        }),
      );
    }

    await Promise.all(promises);

    return params;
  }
}
