import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../utils/services/prisma.service';
import { CreateFeedbackDto } from './general.dto';

@Injectable()
export class GeneralService {
  constructor(private prisma: PrismaService) {}

  async createFeedback(body: CreateFeedbackDto) {
    if (!(await this.prisma.user.count({ where: { user_id: body.user_id } }))) {
      throw new NotFoundException('User tidak ditemukan');
    }

    await this.prisma.feedback.create({
      data: {
        user_id: body.user_id,
        fullname: body.fullname,
        rating: body.rating,
        text: body.text,
        created_at: new Date(),
      },
    });

    return body;
  }
}
