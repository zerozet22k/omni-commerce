import { connectToDatabase } from "@/lib/db/mongodb";
import {
  BrandModel,
  CategoryModel,
  OptionTypeModel,
  OptionValueModel,
  ProductModel,
  ProductTypeModel,
  ProductVariantModel,
  TaxClassModel,
  type BrandDocument,
  type CategoryDocument,
  type OptionTypeDocument,
  type OptionValueDocument,
  type ProductDocument,
  type ProductTypeDocument,
  type ProductVariantDocument,
  type ProductVariantSchema,
  type TaxClassDocument,
} from "@/modules/catalog/catalog.models";

export class CatalogRepository {
  async createCategory(input: Record<string, unknown>) {
    await connectToDatabase();
    return CategoryModel.create(input);
  }

  async findCategoryById(categoryId: string): Promise<CategoryDocument | null> {
    await connectToDatabase();
    return CategoryModel.findById(categoryId).exec();
  }

  async listCategories(): Promise<CategoryDocument[]> {
    await connectToDatabase();
    return CategoryModel.find()
      .sort({ depth: 1, sortOrder: 1, categoryName: 1 })
      .exec();
  }

  async createBrand(input: Record<string, unknown>) {
    await connectToDatabase();
    return BrandModel.create(input);
  }

  async findBrandById(brandId: string): Promise<BrandDocument | null> {
    await connectToDatabase();
    return BrandModel.findById(brandId).exec();
  }

  async listBrands(): Promise<BrandDocument[]> {
    await connectToDatabase();
    return BrandModel.find().sort({ brandName: 1 }).exec();
  }

  async createProductType(input: Record<string, unknown>) {
    await connectToDatabase();
    return ProductTypeModel.create(input);
  }

  async findProductTypeById(
    productTypeId: string,
  ): Promise<ProductTypeDocument | null> {
    await connectToDatabase();
    return ProductTypeModel.findById(productTypeId).exec();
  }

  async listProductTypes(): Promise<ProductTypeDocument[]> {
    await connectToDatabase();
    return ProductTypeModel.find().sort({ name: 1 }).exec();
  }

  async createTaxClass(input: Record<string, unknown>) {
    await connectToDatabase();
    return TaxClassModel.create(input);
  }

  async findTaxClassById(
    taxClassId: string,
  ): Promise<TaxClassDocument | null> {
    await connectToDatabase();
    return TaxClassModel.findById(taxClassId).exec();
  }

  async listTaxClasses(): Promise<TaxClassDocument[]> {
    await connectToDatabase();
    return TaxClassModel.find().sort({ taxClassName: 1 }).exec();
  }

  async createOptionType(input: Record<string, unknown>) {
    await connectToDatabase();
    return OptionTypeModel.create(input);
  }

  async findOptionTypeById(
    optionTypeId: string,
  ): Promise<OptionTypeDocument | null> {
    await connectToDatabase();
    return OptionTypeModel.findById(optionTypeId).exec();
  }

  async listOptionTypes(): Promise<OptionTypeDocument[]> {
    await connectToDatabase();
    return OptionTypeModel.find().sort({ optionName: 1 }).exec();
  }

  async createOptionValue(input: Record<string, unknown>) {
    await connectToDatabase();
    return OptionValueModel.create(input);
  }

  async listOptionValues(optionTypeId?: string): Promise<OptionValueDocument[]> {
    await connectToDatabase();
    return OptionValueModel.find(optionTypeId ? { optionTypeId } : {})
      .sort({ sortOrder: 1, valueName: 1 })
      .exec();
  }

  async findOptionValueById(
    optionValueId: string,
  ): Promise<OptionValueDocument | null> {
    await connectToDatabase();
    return OptionValueModel.findById(optionValueId).exec();
  }

  async createProduct(input: Record<string, unknown>) {
    await connectToDatabase();
    return ProductModel.create(input);
  }

  async findProductById(productId: string): Promise<ProductDocument | null> {
    await connectToDatabase();
    return ProductModel.findById(productId).exec();
  }

  async findProductBySlug(slug: string): Promise<ProductDocument | null> {
    await connectToDatabase();
    return ProductModel.findOne({ slug }).exec();
  }

  async listProducts(
    filter: Record<string, unknown> = {},
  ): Promise<ProductDocument[]> {
    await connectToDatabase();
    return ProductModel.find(filter)
      .sort({ isFeatured: -1, createdAt: -1 })
      .exec();
  }

  async updateProduct(
    productId: string,
    update: Record<string, unknown>,
  ): Promise<ProductDocument | null> {
    await connectToDatabase();
    return ProductModel.findByIdAndUpdate(productId, update, {
      new: true,
    }).exec();
  }

  async createVariant(input: Record<string, unknown>) {
    await connectToDatabase();
    return ProductVariantModel.create(input);
  }

  async updateVariant(
    variantId: string,
    update: Record<string, unknown>,
  ): Promise<ProductVariantDocument | null> {
    await connectToDatabase();
    return ProductVariantModel.findByIdAndUpdate(variantId, update, {
      new: true,
    }).exec();
  }

  async findVariantById(
    variantId: string,
  ): Promise<ProductVariantDocument | null> {
    await connectToDatabase();
    return ProductVariantModel.findById(variantId).exec();
  }

  async listVariantsByProduct(
    productId: string,
  ): Promise<ProductVariantDocument[]> {
    await connectToDatabase();
    return ProductVariantModel.find({ productId })
      .sort({ isDefault: -1, createdAt: 1 })
      .exec();
  }

  async clearDefaultVariantsByProduct(productId: string, variantId?: string) {
    await connectToDatabase();
    const filter = variantId
      ? { productId, _id: { $ne: variantId } }
      : { productId };
    await ProductVariantModel.updateMany(filter, { isDefault: false }).exec();
  }

  async setVariantInventory(
    variantId: string,
    update: Pick<
      ProductVariantSchema,
      "stockQty" | "reservedQty" | "availableQty" | "isActive"
    >,
  ): Promise<ProductVariantDocument | null> {
    await connectToDatabase();
    return ProductVariantModel.findByIdAndUpdate(variantId, update, {
      new: true,
    }).exec();
  }
}
