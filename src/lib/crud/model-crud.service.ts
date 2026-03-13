import { AppError } from "@/lib/errors/app-error";
import { assertObjectId } from "@/lib/utils/object-id";
import { ModelCrudRepository } from "@/lib/crud/model-crud.repository";

export type CrudListOptions = {
  sort?: Record<string, 1 | -1>;
  limit?: number;
  page?: number;
  skip?: number;
};

export class ModelCrudService {
  constructor(
    private readonly entityName: string,
    private readonly repository: ModelCrudRepository,
    private readonly defaultSort?: Record<string, 1 | -1>,
  ) {}

  async list(filter: Record<string, unknown> = {}, options: CrudListOptions = {}) {
    const limit = options.limit;
    const page = options.page;
    const skip =
      typeof options.skip === "number"
        ? options.skip
        : typeof page === "number" &&
            typeof limit === "number" &&
            page > 0 &&
            limit > 0
          ? (page - 1) * limit
          : undefined;

    return this.repository.list(filter, {
      sort: options.sort ?? this.defaultSort,
      limit,
      skip,
    });
  }

  async count(filter: Record<string, unknown> = {}) {
    return this.repository.count(filter);
  }

  async get(id: string) {
    assertObjectId(id, `${this.entityName} id`);
    const document = await this.repository.getById(id);

    if (!document) {
      throw new AppError(`${this.entityName} not found.`, 404);
    }

    return document;
  }

  async create(payload: Record<string, unknown>) {
    return this.repository.create(payload);
  }

  async update(id: string, payload: Record<string, unknown>) {
    assertObjectId(id, `${this.entityName} id`);
    const document = await this.repository.update(id, payload);

    if (!document) {
      throw new AppError(`${this.entityName} not found.`, 404);
    }

    return document;
  }

  async remove(id: string) {
    assertObjectId(id, `${this.entityName} id`);
    const document = await this.repository.remove(id);

    if (!document) {
      throw new AppError(`${this.entityName} not found.`, 404);
    }

    return document;
  }
}

export type CrudServiceContract = {
  list: (
    filter?: Record<string, unknown>,
    options?: CrudListOptions,
  ) => Promise<unknown>;
  count: (filter?: Record<string, unknown>) => Promise<number>;
  get: (id: string) => Promise<unknown>;
  create: (payload: Record<string, unknown>) => Promise<unknown>;
  update: (id: string, payload: Record<string, unknown>) => Promise<unknown>;
  remove: (id: string) => Promise<unknown>;
};
