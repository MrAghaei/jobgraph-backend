import { Injectable, NotFoundException } from "@nestjs/common";
import {
  JobStatus,
  Prisma,
  WorkType,
  categoryFilterValues,
  listJobinjaCategories,
} from "@repo/database";
import { PrismaService } from "../prisma/prisma.service";
import {
  JobDetailDto,
  JobFiltersDto,
  JobListItemDto,
  PaginatedJobsDto,
} from "./dto/job-response.dto";
import { ListJobsQueryDto } from "./dto/list-jobs-query.dto";

const jobListInclude = {
  company: {
    select: {
      id: true,
      name: true,
      website: true,
      logoUrl: true,
    },
  },
  tags: {
    include: {
      tag: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  },
} satisfies Prisma.JobInclude;

type JobWithRelations = Prisma.JobGetPayload<{
  include: typeof jobListInclude;
}>;

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListJobsQueryDto): Promise<PaginatedJobsDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = await this.buildWhere(query);

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.job.count({ where }),
      this.prisma.job.findMany({
        where,
        include: jobListInclude,
        orderBy: { postedAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: rows.map((row) => this.toListItem(row)),
      meta: {
        total,
        page,
        limit,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<JobDetailDto> {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: jobListInclude,
    });

    if (!job) {
      throw new NotFoundException(`Job ${id} not found`);
    }

    return this.toDetail(job);
  }

  async getFilters(): Promise<JobFiltersDto> {
    const cities = await this.prisma.job.findMany({
      where: {
        status: JobStatus.ACTIVE,
        city: { not: null },
      },
      distinct: ["city"],
      select: { city: true },
      orderBy: { city: "asc" },
    });

    return {
      categories: listJobinjaCategories().map(({ key, label }) => ({
        key,
        label,
      })),
      cities: cities
        .map((row) => row.city)
        .filter((city): city is string => Boolean(city)),
      workTypes: [WorkType.REMOTE, WorkType.HYBRID, WorkType.ONSITE],
    };
  }

  private async buildWhere(query: ListJobsQueryDto): Promise<Prisma.JobWhereInput> {
    const where: Prisma.JobWhereInput = {
      status: query.status ?? JobStatus.ACTIVE,
    };

    if (query.category) {
      where.category = { in: categoryFilterValues(query.category) };
    }

    if (query.city) {
      where.city = query.city;
    }

    if (query.workType) {
      where.workType = query.workType;
    }

    const term = query.search?.trim() || query.q?.trim();
    if (!term) {
      return where;
    }

    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Job"
      WHERE to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("description", ''))
            @@ plainto_tsquery('simple', ${term})
    `;
    const ftsIds = rows.map((row) => row.id);

    where.AND = [
      {
        OR: [
          ...(ftsIds.length > 0 ? [{ id: { in: ftsIds } }] : []),
          { company: { name: { contains: term, mode: "insensitive" } } },
          {
            tags: {
              some: {
                tag: { name: { contains: term, mode: "insensitive" } },
              },
            },
          },
        ],
      },
    ];

    return where;
  }

  private toListItem(job: JobWithRelations): JobListItemDto {
    return {
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      city: job.city,
      salaryRange: job.salaryRange,
      experienceLevel: job.experienceLevel,
      workType: job.workType,
      category: job.category,
      source: job.source,
      sourceUrl: job.sourceUrl,
      postedAt: job.postedAt,
      status: job.status,
      tags: job.tags.map((jt) => jt.tag),
    };
  }

  private toDetail(job: JobWithRelations): JobDetailDto {
    return {
      ...this.toListItem(job),
      description: job.description,
      datePosted: job.datePosted,
      expiredAt: job.expiredAt,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}
