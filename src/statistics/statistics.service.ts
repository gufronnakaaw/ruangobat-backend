import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { PrismaService } from '../utils/services/prisma.service';

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getLoginStatistics(timezone = 'Asia/Jakarta') {
    const today = DateTime.now().setZone(timezone).startOf('day');
    const until = today.plus({ days: 1 });

    const start_month = DateTime.fromObject(
      { year: 2024, month: 10 },
      { zone: timezone },
    ).startOf('month');

    const end_month = today.startOf('month').plus({ months: 1 });
    const seven_days_ago = today.minus({ days: 7 });

    const [today_stats, week_stats, month_stats] =
      await this.prisma.$transaction([
        this.prisma.logLogin.count({
          where: {
            timestamp: {
              gte: today.toJSDate(),
              lt: until.toJSDate(),
            },
            type: 'user',
          },
        }),
        this.prisma.$queryRawUnsafe<{ day: string; value: number }[]>(
          `
          SELECT
            DATE_FORMAT(timestamp, '%Y-%m-%d') as day,
            COUNT(*) as value
          FROM log_login
          WHERE timestamp >= ? AND timestamp < ? AND type = 'user'
          GROUP BY day
          ORDER BY day ASC
        `,
          seven_days_ago.toJSDate(),
          today.toJSDate(),
        ),
        this.prisma.$queryRawUnsafe<
          {
            month: string;
            value: number;
          }[]
        >(
          `
          SELECT
            DATE_FORMAT(timestamp, '%M %Y') as month,
            COUNT(*) as value
          FROM log_login
          WHERE timestamp >= ? AND type = 'user'
          GROUP BY month
          ORDER BY month ASC
        `,
          start_month.toJSDate(),
        ),
      ]);

    const week_stats_map = new Map(
      week_stats.map((row) => [
        DateTime.fromJSDate(new Date(row.day))
          .setLocale('id')
          .toFormat('dd MMMM yyyy'),
        Number(row.value),
      ]),
    );

    const month_stats_map = new Map(
      month_stats.map((row) => [
        DateTime.fromFormat(row.month, 'MMMM yyyy', { locale: 'en' })
          .setLocale('id')
          .toFormat('MMMM yyyy'),
        Number(row.value),
      ]),
    );

    const week = [];
    let cursor_week = seven_days_ago;
    while (cursor_week < today) {
      const label = cursor_week.setLocale('id').toFormat('dd MMMM yyyy');
      week.push({
        day: label,
        value: week_stats_map.get(label) ?? 0,
      });
      cursor_week = cursor_week.plus({ days: 1 });
    }

    const months = [];
    let cursor_month = start_month;
    while (cursor_month < end_month) {
      const label = cursor_month.setLocale('id').toFormat('MMMM yyyy');
      months.push({
        month: label,
        value: month_stats_map.get(label) ?? 0,
      });
      cursor_month = cursor_month.plus({ months: 1 });
    }

    return {
      today: {
        day: today.setLocale('id').toFormat('dd MMMM yyyy'),
        value: today_stats,
      },
      last_seven_days: week,
      months,
    };
  }

  async getRegisteredUserStatistics(timezone = 'Asia/Jakarta') {
    const today = DateTime.now().setZone(timezone).startOf('day');
    const until = today.plus({ days: 1 });

    const start_month = DateTime.fromObject(
      { year: 2024, month: 10 },
      { zone: timezone },
    ).startOf('month');

    const end_month = today.startOf('month').plus({ months: 1 });
    const seven_days_ago = today.minus({ days: 7 });

    const [today_stats, week_stats, month_stats] =
      await this.prisma.$transaction([
        this.prisma.user.count({
          where: {
            created_at: {
              gte: today.toJSDate(),
              lt: until.toJSDate(),
            },
          },
        }),
        this.prisma.$queryRawUnsafe<{ day: string; value: number }[]>(
          `
          SELECT
            DATE_FORMAT(created_at, '%Y-%m-%d') as day,
            COUNT(*) as value
          FROM user
          WHERE created_at >= ? AND created_at < ?
          GROUP BY day
          ORDER BY day ASC
        `,
          seven_days_ago.toJSDate(),
          today.toJSDate(),
        ),
        this.prisma.$queryRawUnsafe<
          {
            month: string;
            value: number;
          }[]
        >(
          `
          SELECT
            DATE_FORMAT(created_at, '%M %Y') as month,
            COUNT(*) as value
          FROM user
          WHERE created_at >= ?
          GROUP BY month
          ORDER BY month ASC
        `,
          start_month.toJSDate(),
        ),
      ]);

    const week_stats_map = new Map(
      week_stats.map((row) => [
        DateTime.fromJSDate(new Date(row.day))
          .setLocale('id')
          .toFormat('dd MMMM yyyy'),
        Number(row.value),
      ]),
    );

    const month_stats_map = new Map(
      month_stats.map((row) => [
        DateTime.fromFormat(row.month, 'MMMM yyyy', { locale: 'en' })
          .setLocale('id')
          .toFormat('MMMM yyyy'),
        Number(row.value),
      ]),
    );

    const week = [];
    let cursor_week = seven_days_ago;
    while (cursor_week < today) {
      const label = cursor_week.setLocale('id').toFormat('dd MMMM yyyy');
      week.push({
        day: label,
        value: week_stats_map.get(label) ?? 0,
      });
      cursor_week = cursor_week.plus({ days: 1 });
    }

    const months = [];
    let cursor_month = start_month;
    while (cursor_month < end_month) {
      const label = cursor_month.setLocale('id').toFormat('MMMM yyyy');
      months.push({
        month: label,
        value: month_stats_map.get(label) ?? 0,
      });
      cursor_month = cursor_month.plus({ months: 1 });
    }

    return {
      today: {
        day: today.setLocale('id').toFormat('dd MMMM yyyy'),
        value: today_stats,
      },
      last_seven_days: week,
      months,
    };
  }

  async getAiUsageStatistics(timezone = 'Asia/Jakarta') {
    const today = DateTime.now().setZone(timezone).startOf('day');
    const until = today.plus({ days: 1 });

    const start_month = DateTime.fromObject(
      { year: 2024, month: 10 },
      { zone: timezone },
    ).startOf('month');

    const end_month = today.startOf('month').plus({ months: 1 });
    const seven_days_ago = today.minus({ days: 7 });

    const [today_stats, week_stats, month_stats] =
      await this.prisma.$transaction([
        this.prisma.$queryRawUnsafe<
          {
            total_chat: number;
            total_cost: number;
            total_tokens: number;
          }[]
        >(
          `
        SELECT
          COUNT(*) as total_chat,
          SUM(total_cost) as total_cost,
          SUM(total_tokens) as total_tokens
        FROM ai_chat
        WHERE created_at >= ? AND created_at < ?
      `,
          today.toJSDate(),
          until.toJSDate(),
        ),
        this.prisma.$queryRawUnsafe<
          {
            day: string;
            total_chat: number;
            total_cost: number;
            total_tokens: number;
          }[]
        >(
          `
        SELECT
          DATE_FORMAT(created_at, '%Y-%m-%d') as day,
          COUNT(*) as total_chat,
          SUM(total_cost) as total_cost,
          SUM(total_tokens) as total_tokens
        FROM ai_chat
        WHERE created_at >= ? AND created_at < ?
        GROUP BY day
        ORDER BY day ASC
      `,
          seven_days_ago.toJSDate(),
          today.toJSDate(),
        ),
        this.prisma.$queryRawUnsafe<
          {
            month: string;
            total_chat: number;
            total_cost: number;
            total_tokens: number;
          }[]
        >(
          `
        SELECT
          DATE_FORMAT(created_at, '%M %Y') as month,
          COUNT(*) as total_chat,
          SUM(total_cost) as total_cost,
          SUM(total_tokens) as total_tokens
        FROM ai_chat
        WHERE created_at >= ? AND created_at < ?
        GROUP BY month
        ORDER BY month ASC
      `,
          start_month.toJSDate(),
          end_month.toJSDate(),
        ),
      ]);

    const week_stats_map = new Map(
      week_stats.map((row) => [
        DateTime.fromJSDate(new Date(row.day))
          .setLocale('id')
          .toFormat('dd MMMM yyyy'),
        {
          total_chat: Number(row.total_chat),
          total_cost: Number(row.total_cost),
          total_tokens: Number(row.total_tokens),
        },
      ]),
    );

    const month_stats_map = new Map(
      month_stats.map((row) => [
        DateTime.fromFormat(row.month, 'MMMM yyyy', { locale: 'en' })
          .setLocale('id')
          .toFormat('MMMM yyyy'),
        {
          total_chat: Number(row.total_chat),
          total_cost: Number(row.total_cost),
          total_tokens: Number(row.total_tokens),
        },
      ]),
    );

    const week = [];
    let cursor_week = seven_days_ago;
    while (cursor_week < today) {
      const label = cursor_week.setLocale('id').toFormat('dd MMMM yyyy');
      week.push({
        day: label,
        ...(week_stats_map.get(label) ?? {
          total_chat: 0,
          total_cost: 0,
          total_tokens: 0,
        }),
      });
      cursor_week = cursor_week.plus({ days: 1 });
    }

    const months = [];
    let cursor_month = start_month;
    while (cursor_month < end_month) {
      const label = cursor_month.setLocale('id').toFormat('MMMM yyyy');
      months.push({
        month: label,
        ...(month_stats_map.get(label) ?? {
          total_chat: 0,
          total_cost: 0,
          total_tokens: 0,
        }),
      });
      cursor_month = cursor_month.plus({ months: 1 });
    }

    console.log(month_stats);

    return {
      today: {
        day: today.setLocale('id').toFormat('dd MMMM yyyy'),
        total_chat: Number(today_stats[0].total_chat),
        total_cost: Number(today_stats[0].total_cost),
        total_tokens: Number(today_stats[0].total_tokens),
      },
      last_seven_days: week,
      months,
    };
  }
}
