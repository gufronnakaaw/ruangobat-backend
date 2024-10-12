import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hashPassword } from '../utils/bcrypt.util';
import { capitalize } from '../utils/capitalize.util';
import { PrismaService } from '../utils/services/prisma.service';
import { UpdateAdminsDto } from './admins.dto';

@Injectable()
export class AdminsService {
  constructor(private prisma: PrismaService) {}

  getAdmins() {
    return this.prisma.admin.findMany({
      where: {
        admin_id: {
          not: 'ROSA1',
        },
      },
      select: {
        admin_id: true,
        fullname: true,
        role: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async updateAdmins(body: UpdateAdminsDto) {
    if (body.access_key !== process.env.ACCESS_KEY) {
      throw new ForbiddenException();
    }

    if (
      !(await this.prisma.admin.count({ where: { admin_id: body.admin_id } }))
    ) {
      throw new NotFoundException('Admin tidak ditemukan');
    }

    return this.prisma.admin.update({
      where: {
        admin_id: body.admin_id,
      },
      data: {
        fullname: capitalize(body.fullname.toLowerCase()),
        password: await hashPassword(body.password),
        role: body.role,
      },
      select: {
        admin_id: true,
        fullname: true,
        role: true,
      },
    });
  }

  async deleteAdmins(admin_id: string) {
    if (!(await this.prisma.admin.count({ where: { admin_id } }))) {
      throw new NotFoundException('Admin tidak ditemukan');
    }

    return this.prisma.admin.delete({
      where: {
        admin_id,
      },
      select: {
        fullname: true,
        admin_id: true,
      },
    });
  }

  async getAdmin(admin_id: string) {
    return this.prisma.admin.findUnique({
      where: {
        admin_id,
      },
      select: {
        admin_id: true,
        fullname: true,
        role: true,
      },
    });
  }
}
