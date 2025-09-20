import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { DateTime } from 'luxon';
import { firstValueFrom, Observable } from 'rxjs';
import { AiQuery } from '../ai/ai.dto';
import { PrismaService } from '../utils/services/prisma.service';

@Injectable()
export class StatisticsService {
  constructor(
    private readonly prisma: PrismaService,
    private http: HttpService,
  ) {}

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

    const credits = await firstValueFrom(
      this.http.get(`${process.env.PROVIDER_URL}/api/v1/credits`, {
        headers: {
          Authorization: `Bearer ${process.env.PROVIDER_CREDIT_KEY}`,
        },
      }) as Observable<
        AxiosResponse<{
          data: { total_credits: number; total_usage: number };
        }>
      >,
    );

    return {
      remaining_credits:
        credits.data.data.total_credits - credits.data.data.total_usage,
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

  async getAllUsersEverReachedLimit(query: AiQuery) {
    const page = Number(query.page) || 1;
    const take = 10;
    const skip = (page - 1) * take;

    const global_limits = await this.prisma.aiLimit.findMany({
      select: { total: true, type: true },
    });

    const paid_limit =
      global_limits.find((limit) => limit.type === 'paid')?.total ?? 0;
    const free_limit =
      global_limits.find((limit) => limit.type === 'free')?.total ?? 0;

    const where_condition = {
      ...(query.q && {
        OR: [
          { fullname: { contains: query.q } },
          { user_id: { contains: query.q } },
          { university: { contains: query.q } },
        ],
      }),
    };

    const users_with_chats = await this.prisma.user.findMany({
      where: {
        ...where_condition,
        chats: { some: {} },
      },
      select: {
        user_id: true,
        fullname: true,
        university: true,
        userlimit: {
          select: {
            total: true,
            expired_at: true,
          },
        },
        access: {
          where: {
            status: 'active',
            type: { in: ['apotekerclass', 'videocourse', 'videoukmppai'] },
          },
          select: { access_id: true },
        },
        chats: {
          select: {
            created_at: true,
            total_cost: true,
          },
        },
        _count: {
          select: { chats: true },
        },
      },
    });

    const users_ever_reached_limit = [];

    for (const user of users_with_chats) {
      const has_access = user.access.length > 0;
      let effective_limit: number;

      if (user.userlimit) {
        const now = new Date();
        const expired = new Date(user.userlimit.expired_at);
        if (now > expired) {
          effective_limit = has_access ? paid_limit : free_limit;
        } else {
          effective_limit = user.userlimit.total;
        }
      } else {
        effective_limit = has_access ? paid_limit : free_limit;
      }

      const chat_by_date = new Map<string, number>();
      for (const chat of user.chats) {
        const date = chat.created_at.toISOString().split('T')[0];
        chat_by_date.set(date, (chat_by_date.get(date) || 0) + 1);
      }

      const days_reached_limit = Array.from(chat_by_date.values()).filter(
        (count) => count >= effective_limit,
      ).length;

      if (days_reached_limit > 0) {
        const dates_reached = Array.from(chat_by_date.entries())
          .filter(([_, count]) => count >= effective_limit)
          .map(([date]) => new Date(date));

        const total_cost = user.chats.reduce(
          (sum, chat) => sum + Number(chat.total_cost),
          0,
        );

        users_ever_reached_limit.push({
          user_id: user.user_id,
          fullname: user.fullname,
          university: user.university,
          total_chat: user._count.chats,
          total_cost: Number(total_cost),
          effective_limit,
          has_access,
          custom_limit: user.userlimit?.total || null,
          limit_expired: user.userlimit?.expired_at || null,
          days_reached_limit,
          first_reached_date: dates_reached[0],
          last_reached_date: dates_reached[dates_reached.length - 1],
          days_since_first_limit: Math.floor(
            (new Date().getTime() - dates_reached[0].getTime()) /
              (1000 * 60 * 60 * 24),
          ),
          limit_frequency: Math.round(
            (days_reached_limit / chat_by_date.size) * 100,
          ),
        });
      }
    }

    users_ever_reached_limit.sort(
      (a, b) => b.days_reached_limit - a.days_reached_limit,
    );

    // Pagination
    const total_users = users_ever_reached_limit.length;
    const paginated_users = users_ever_reached_limit.slice(skip, skip + take);

    return {
      users: paginated_users,
      page,
      total_users,
      total_pages: Math.ceil(total_users / take),
      summary: {
        total_users_ever_reached_limit: total_users,
        total_days_reached_across_all_users: users_ever_reached_limit.reduce(
          (sum, user) => sum + user.days_reached_limit,
          0,
        ),
        average_days_reached_per_user:
          total_users > 0
            ? Number(
                (
                  users_ever_reached_limit.reduce(
                    (sum, user) => sum + user.days_reached_limit,
                    0,
                  ) / total_users
                ).toFixed(2),
              )
            : 0,
        most_frequent_limit_reacher: paginated_users[0] || null,
        chronic_limit_users: users_ever_reached_limit.filter(
          (user) => user.days_reached_limit >= 5,
        ).length,
        recent_limit_users: users_ever_reached_limit.filter(
          (user) => user.days_since_first_limit <= 30,
        ).length,
      },
    };
  }

  async getUsersReachedLimitToday(query: AiQuery, timezone = 'Asia/Jakarta') {
    const today = DateTime.now().setZone(timezone).startOf('day');
    const until = today.plus({ days: 1 });

    const page = Number(query.page) || 1;
    const take = 10;
    const skip = (page - 1) * take;

    const global_limits = await this.prisma.aiLimit.findMany({
      select: { total: true, type: true },
    });

    const paid_limit =
      global_limits.find((limit) => limit.type === 'paid')?.total ?? 0;
    const free_limit =
      global_limits.find((limit) => limit.type === 'free')?.total ?? 0;

    const calculateEffectiveLimit = (
      user: {
        access: { access_id: string }[];
        userlimit?: {
          total: number;
          expired_at: Date;
        };
      },
      paid_limit: number,
      free_limit: number,
    ): number => {
      const has_access = user.access.length > 0;
      if (user.userlimit) {
        const now = new Date();
        const expired = new Date(user.userlimit.expired_at);
        if (now > expired) {
          return has_access ? paid_limit : free_limit;
        }
        return user.userlimit.total;
      }
      return has_access ? paid_limit : free_limit;
    };

    const all_users_with_chat = await this.prisma.user.findMany({
      where: {
        chats: {
          some: {
            created_at: {
              gte: today.toJSDate(),
              lt: until.toJSDate(),
            },
          },
        },
        ...(query.q && {
          OR: [
            { fullname: { contains: query.q } },
            { user_id: { contains: query.q } },
          ],
        }),
      },
      select: {
        user_id: true,
        fullname: true,
        university: true,
        userlimit: {
          select: {
            total: true,
            expired_at: true,
          },
        },
        access: {
          where: {
            status: 'active',
            OR: [
              { type: 'apotekerclass' },
              { type: 'videocourse' },
              { type: 'videoukmppai' },
            ],
          },
          select: { access_id: true },
        },
        _count: {
          select: {
            chats: {
              where: {
                created_at: {
                  gte: today.toJSDate(),
                  lt: until.toJSDate(),
                },
              },
            },
          },
        },
      },
    });

    const users_reached_limit = all_users_with_chat.filter((user) => {
      const chat_count = user._count.chats;
      const user_limit = calculateEffectiveLimit(user, paid_limit, free_limit);
      return chat_count >= user_limit;
    });

    const total_users = users_reached_limit.length;
    const paginated_users = users_reached_limit.slice(skip, skip + take);

    return {
      users: paginated_users.map((user) => ({
        user_id: user.user_id,
        fullname: user.fullname,
        university: user.university,
        chat_count_today: user._count.chats,
        has_access: user.access.length > 0,
        custom_limit: user.userlimit?.total,
        limit_expired: user.userlimit
          ? new Date() > new Date(user.userlimit.expired_at)
          : null,
        effective_limit: calculateEffectiveLimit(user, paid_limit, free_limit),
      })),
      page,
      total_users,
      total_pages: Math.ceil(total_users / take),
    };
  }

  async getAllChatUsersToday(query: AiQuery, timezone = 'Asia/Jakarta') {
    const today = DateTime.now().setZone(timezone).startOf('day');
    const until = today.plus({ days: 1 });

    const page = Number(query.page) || 1;
    const take = 10;
    const skip = (page - 1) * take;

    const global_limits = await this.prisma.aiLimit.findMany({
      select: { total: true, type: true },
    });

    const paid_limit =
      global_limits.find((limit) => limit.type === 'paid')?.total ?? 0;
    const free_limit =
      global_limits.find((limit) => limit.type === 'free')?.total ?? 0;

    const calculateEffectiveLimit = (
      user: {
        access: { access_id: string }[];
        userlimit?: {
          total: number;
          expired_at: Date;
        };
      },
      paid_limit: number,
      free_limit: number,
    ): number => {
      const has_access = user.access.length > 0;
      if (user.userlimit) {
        const now = new Date();
        const expired = new Date(user.userlimit.expired_at);
        if (now > expired) {
          return has_access ? paid_limit : free_limit;
        }
        return user.userlimit.total;
      }
      return has_access ? paid_limit : free_limit;
    };

    const base_where = {
      chats: {
        some: {
          created_at: {
            gte: today.toJSDate(),
            lt: until.toJSDate(),
          },
        },
      },
      ...(query.q && {
        OR: [
          { fullname: { contains: query.q } },
          { user_id: { contains: query.q } },
          { university: { contains: query.q } },
        ],
      }),
    };

    const [total_count, users_with_chat] = await Promise.all([
      this.prisma.user.count({ where: base_where }),
      this.prisma.user.findMany({
        where: base_where,
        select: {
          user_id: true,
          fullname: true,
          university: true,
          userlimit: {
            select: {
              total: true,
              expired_at: true,
            },
          },
          access: {
            where: {
              status: 'active',
              OR: [
                { type: 'apotekerclass' },
                { type: 'videocourse' },
                { type: 'videoukmppai' },
              ],
            },
            select: { access_id: true },
          },
          chats: {
            where: {
              created_at: {
                gte: today.toJSDate(),
                lt: until.toJSDate(),
              },
            },
            select: {
              total_cost: true,
            },
          },
          _count: {
            select: {
              chats: {
                where: {
                  created_at: {
                    gte: today.toJSDate(),
                    lt: until.toJSDate(),
                  },
                },
              },
            },
          },
        },
        skip,
        take,
        orderBy: {
          chats: {
            _count: 'desc',
          },
        },
      }),
    ]);

    return {
      users: users_with_chat.map((user) => {
        const total_cost = user.chats.reduce((sum, chat) => {
          return sum + (Number(chat.total_cost) || 0);
        }, 0);

        const effective_limit = calculateEffectiveLimit(
          user,
          paid_limit,
          free_limit,
        );
        const chat_count = user._count.chats;
        const has_access = user.access.length > 0;

        return {
          user_id: user.user_id,
          fullname: user.fullname,
          university: user.university,
          total_chat_today: chat_count,
          total_cost_today: Number(total_cost),
          effective_limit,
          has_access,
          custom_limit: user.userlimit?.total,
          limit_expired: user.userlimit ? user.userlimit.expired_at : null,
          usage_percentage: Math.round((chat_count / effective_limit) * 100),
          is_limit_reached: chat_count >= effective_limit,
        };
      }),
      page,
      total_users: total_count,
      total_pages: Math.ceil(total_count / take),
    };
  }

  async getAllUsersWithTotalCost(query: AiQuery) {
    const page = Number(query.page) || 1;
    const take = 10;
    const skip = (page - 1) * take;

    const search_condition = query.q
      ? `WHERE (u.fullname LIKE '%${query.q}%' OR u.user_id LIKE '%${query.q}%' OR u.university LIKE '%${query.q}%')`
      : '';

    const users_data = await this.prisma.$queryRawUnsafe<
      {
        user_id: string;
        fullname: string;
        university: string;
        total_chat: bigint;
        total_cost: string;
      }[]
    >(
      `
    SELECT 
      u.user_id,
      u.fullname,
      u.university,
      COALESCE(chat_stats.total_chat, 0) as total_chat,
      COALESCE(chat_stats.total_cost, 0) as total_cost
    FROM user u
    LEFT JOIN (
      SELECT 
        user_id,
        COUNT(*) as total_chat,
        SUM(total_cost) as total_cost
      FROM ai_chat
      GROUP BY user_id
    ) chat_stats ON u.user_id = chat_stats.user_id
    ${search_condition}
    ORDER BY COALESCE(chat_stats.total_cost, 0) DESC
    LIMIT ? OFFSET ?
    `,
      take,
      skip,
    );

    const total_count_result = await this.prisma.$queryRawUnsafe<
      { total: bigint }[]
    >(
      `
    SELECT COUNT(*) as total
    FROM user u
    ${search_condition}
    `,
    );

    const summary_data = await this.prisma.$queryRawUnsafe<
      {
        total_users: bigint;
        total_chats: bigint;
        total_cost: string;
      }[]
    >(
      `
    SELECT 
      COUNT(*) as total_users,
      COALESCE(SUM(chat_stats.total_chat), 0) as total_chats,
      COALESCE(SUM(chat_stats.total_cost), 0) as total_cost
    FROM user u
    LEFT JOIN (
      SELECT 
        user_id,
        COUNT(*) as total_chat,
        SUM(total_cost) as total_cost
      FROM ai_chat
      GROUP BY user_id
    ) chat_stats ON u.user_id = chat_stats.user_id
    `,
    );

    const processed_users = users_data.map((user) => ({
      user_id: user.user_id,
      fullname: user.fullname,
      university: user.university,
      total_chat: Number(user.total_chat),
      total_cost: Number(Number(user.total_cost)),
    }));

    const total_users = Number(total_count_result[0]?.total || 0);
    const summary = summary_data[0];

    return {
      users: processed_users,
      page,
      total_users,
      total_pages: Math.ceil(total_users / take),
      summary: {
        total_cost_all_users: Number(Number(summary.total_cost)),
        total_chats_all_users: Number(summary.total_chats),
        average_cost_per_user:
          Number(summary.total_users) > 0
            ? Number(
                (
                  Number(summary.total_cost) / Number(summary.total_users)
                ).toFixed(6),
              )
            : 0,
        average_chats_per_user:
          Number(summary.total_users) > 0
            ? Math.round(
                Number(summary.total_chats) / Number(summary.total_users),
              )
            : 0,
        highest_cost_user: processed_users[0] || null,
        most_active_user: processed_users.reduce(
          (max, user) => (user.total_chat > max.total_chat ? user : max),
          processed_users[0] || null,
        ),
      },
    };
  }
}
