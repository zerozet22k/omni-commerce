import type { Model } from "mongoose";

import { connectToDatabase } from "@/lib/db/mongodb";

export class ModelCrudRepository {
  constructor(private readonly model: Model<unknown>) {}

  async list(
    filter: Record<string, unknown> = {},
    options: {
      sort?: Record<string, 1 | -1>;
      limit?: number;
      skip?: number;
    } = {},
  ) {
    await connectToDatabase();
    const query = this.model.find(filter);

    if (options.sort) {
      query.sort(options.sort);
    }

    if (typeof options.skip === "number" && options.skip > 0) {
      query.skip(options.skip);
    }

    if (typeof options.limit === "number" && options.limit > 0) {
      query.limit(options.limit);
    }

    return query.exec();
  }

  async count(filter: Record<string, unknown> = {}) {
    await connectToDatabase();
    return this.model.countDocuments(filter).exec();
  }

  async getById(id: string) {
    await connectToDatabase();
    return this.model.findById(id).exec();
  }

  async create(payload: Record<string, unknown>) {
    await connectToDatabase();
    return this.model.create(payload);
  }

  async update(id: string, payload: Record<string, unknown>) {
    await connectToDatabase();
    return this.model.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    }).exec();
  }

  async remove(id: string) {
    await connectToDatabase();
    return this.model.findByIdAndDelete(id).exec();
  }
}
