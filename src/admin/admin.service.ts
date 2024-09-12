import { Injectable } from '@nestjs/common';
import ShortUniqueId from 'short-unique-id';
import { PrismaService } from '../utils/services/prisma.service';
import { CreateBankDto } from './admin.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async storeBank(body: CreateBankDto) {
    const { title, questions } = body;
    const uid = new ShortUniqueId({ length: 6 });
    const bank_id = `ROB-${uid.rnd().toUpperCase()}`;
    const promises = [];

    for (const question of questions) {
      promises.push(
        this.prisma.questionDev.create({
          data: {
            bank_id,
            question_id: `ROQ-${uid.rnd().toUpperCase()}`,
            question_text: question.question_text,
            option: {
              createMany: {
                data: question.options.map((option) => {
                  return {
                    option_id: uid.rnd().toUpperCase(),
                    option_text: option.option_text,
                    is_correct: option.is_correct,
                  };
                }),
              },
            },
          },
        }),
      );
    }

    await this.prisma.bankDev.create({
      data: {
        bank_id,
        title,
      },
    });

    await Promise.all(promises);

    return body;
  }

  async getBankById(bank_id: string) {
    const bank = await this.prisma.bankDev.findUnique({
      where: {
        bank_id,
      },
      select: {
        bank_id: true,
        title: true,
        question: {
          select: {
            question_id: true,
            question_text: true,
            option: {
              select: {
                option_id: true,
                option_text: true,
                is_correct: true,
              },
            },
          },
        },
      },
    });

    const questions = bank.question.map((item) => {
      return {
        question_id: item.question_id,
        question_text: item.question_text,
        options: item.option.map((item) => item),
      };
    });

    return {
      bank_id: bank.bank_id,
      title: bank.title,
      questions,
    };
  }
}
