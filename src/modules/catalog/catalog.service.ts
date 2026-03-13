import { AppError } from "@/lib/errors/app-error";
import { assertObjectId } from "@/lib/utils/object-id";
import {
  getVariantAvailabilityState,
  isVariantSellable,
} from "@/modules/catalog/catalog-availability";
import { catalogIdentifiersService } from "@/modules/catalog/catalog-identifiers.service";
import { categoryTreeService } from "@/modules/catalog/category-tree.service";
import { CatalogRepository } from "@/modules/catalog/catalog.repository";

export class CatalogService {
  constructor(private readonly catalogRepository = new CatalogRepository()) {}

  async listCategories() {
    return this.catalogRepository.listCategories();
  }

  async createCategory(input: {
    categoryName: string;
    slug: string;
    parentCategoryId?: string;
    description?: string;
    imageAssetId?: string;
    isActive?: boolean;
    sortOrder?: number;
    seoTitle?: string;
    seoDescription?: string;
  }) {
    if (input.parentCategoryId) {
      assertObjectId(input.parentCategoryId, "parent category id");
    }

    return categoryTreeService.saveCategory(input);
  }

  async listBrands() {
    return this.catalogRepository.listBrands();
  }

  async createBrand(input: {
    brandName: string;
    slug: string;
    originCountryId?: string;
    description?: string;
    logoAssetId?: string;
    websiteUrl?: string;
    isActive?: boolean;
  }) {
    return this.catalogRepository.createBrand(input);
  }

  async listProductTypes() {
    return this.catalogRepository.listProductTypes();
  }

  async createProductType(input: { code: string; name: string }) {
    return this.catalogRepository.createProductType(input);
  }

  async listTaxClasses() {
    return this.catalogRepository.listTaxClasses();
  }

  async createTaxClass(input: {
    taxClassName: string;
    description?: string;
    isActive?: boolean;
  }) {
    return this.catalogRepository.createTaxClass(input);
  }

  async listOptionTypes() {
    return this.catalogRepository.listOptionTypes();
  }

  async createOptionType(input: {
    optionName: string;
    displayType?: "TEXT" | "COLOR_SWATCH" | "BUTTON";
  }) {
    return this.catalogRepository.createOptionType(input);
  }

  async listOptionValues(optionTypeId?: string) {
    if (optionTypeId) {
      assertObjectId(optionTypeId, "option type id");
    }

    return this.catalogRepository.listOptionValues(optionTypeId);
  }

  async createOptionValue(input: {
    optionTypeId: string;
    valueName: string;
    valueCode?: string;
    swatchHex?: string;
    sortOrder?: number;
  }) {
    assertObjectId(input.optionTypeId, "option type id");
    const optionType = await this.catalogRepository.findOptionTypeById(
      input.optionTypeId,
    );

    if (!optionType) {
      throw new AppError("Option type not found.", 404);
    }

    return this.catalogRepository.createOptionValue(input);
  }

  async listProducts(filter?: {
    categoryId?: string;
    brandId?: string;
    status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
    visibility?: "PUBLIC" | "HIDDEN";
  }) {
    return this.catalogRepository.listProducts(filter ?? {});
  }

  async getProductById(productId: string) {
    assertObjectId(productId, "product id");
    return this.catalogRepository.findProductById(productId);
  }

  async getProductBySlug(slug: string) {
    if (!slug.trim()) {
      throw new AppError("Product slug is required.", 400);
    }

    return this.catalogRepository.findProductBySlug(slug.trim());
  }

  async createProduct(input: {
    productName: string;
    slug?: string;
    productTypeId: string;
    categoryId: string;
    brandId?: string;
    taxClassId?: string;
    originCountryId?: string;
    shortDescription?: string;
    description?: string;
    material?: string;
    careInstructions?: string;
    warrantyInfo?: string;
    conditionType?: "NEW" | "REFURBISHED";
    status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
    visibility?: "PUBLIC" | "HIDDEN";
    isFeatured?: boolean;
    isNewArrival?: boolean;
    isBestSeller?: boolean;
    seoTitle?: string;
    seoDescription?: string;
    tagIds?: string[];
    collectionIds?: string[];
    badgeIds?: string[];
    optionTypeIds?: string[];
    specifications?: Array<{
      specGroup?: string;
      specKey: string;
      specValue: string;
      sortOrder?: number;
    }>;
    faqs?: Array<{
      question: string;
      answer: string;
      sortOrder?: number;
      isActive?: boolean;
    }>;
    images?: Array<{
      assetId: string;
      sortOrder?: number;
      isPrimary?: boolean;
    }>;
    relations?: Array<{
      relatedProductId: string;
      relationType: "RELATED" | "UPSELL" | "CROSS_SELL" | "SIMILAR";
      sortOrder?: number;
    }>;
    bundleItems?: Array<{
      childProductId: string;
      childVariantId?: string;
      quantity?: number;
      sortOrder?: number;
    }>;
  }) {
    for (const [key, value] of Object.entries({
      productTypeId: input.productTypeId,
      categoryId: input.categoryId,
      brandId: input.brandId,
      taxClassId: input.taxClassId,
      originCountryId: input.originCountryId,
    })) {
      if (value) {
        assertObjectId(value, key);
      }
    }

    const [productType, category] = await Promise.all([
      this.catalogRepository.findProductTypeById(input.productTypeId),
      this.catalogRepository.findCategoryById(input.categoryId),
    ]);

    if (!productType) {
      throw new AppError("Product type not found.", 404);
    }

    if (!category) {
      throw new AppError("Category not found.", 404);
    }

    if (input.brandId) {
      const brand = await this.catalogRepository.findBrandById(input.brandId);

      if (!brand) {
        throw new AppError("Brand not found.", 404);
      }
    }

    if (input.taxClassId) {
      const taxClass = await this.catalogRepository.findTaxClassById(
        input.taxClassId,
      );

      if (!taxClass) {
        throw new AppError("Tax class not found.", 404);
      }
    }

    for (const optionTypeId of input.optionTypeIds ?? []) {
      assertObjectId(optionTypeId, "option type id");
    }

    const slug = await catalogIdentifiersService.resolveProductSlug({
      productName: input.productName,
      requestedSlug: input.slug,
    });

    return this.catalogRepository.createProduct({
      ...input,
      slug,
    });
  }

  async publishProduct(productId: string) {
    assertObjectId(productId, "product id");
    const product = await this.catalogRepository.updateProduct(productId, {
      status: "ACTIVE",
      publishedAt: new Date(),
    });

    if (!product) {
      throw new AppError("Product not found.", 404);
    }

    return product;
  }

  async addVariant(input: {
    productId: string;
    sku?: string;
    barcode?: string;
    variantName?: string;
    unitPrice: number;
    compareAtPrice?: number;
    costPrice?: number;
    weightGrams?: number;
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
    currencyCode?: string;
    stockQty?: number;
    lowStockThreshold?: number;
    trackInventory?: boolean;
    allowBackorder?: boolean;
    isDefault?: boolean;
    isActive?: boolean;
    optionValueIds?: string[];
    images?: Array<{
      assetId: string;
      sortOrder?: number;
      isPrimary?: boolean;
    }>;
  }) {
    assertObjectId(input.productId, "product id");
    const product = await this.catalogRepository.findProductById(input.productId);

    if (!product) {
      throw new AppError("Product not found.", 404);
    }

    for (const optionValueId of input.optionValueIds ?? []) {
      assertObjectId(optionValueId, "option value id");
      const optionValue = await this.catalogRepository.findOptionValueById(
        optionValueId,
      );

      if (!optionValue) {
        throw new AppError("Option value not found.", 404);
      }
    }

    const stockQty = input.stockQty ?? 0;
    const reservedQty = 0;
    const availableQty = stockQty - reservedQty;
    const existingVariants = await this.catalogRepository.listVariantsByProduct(
      input.productId,
    );
    const shouldBeDefault = input.isDefault || existingVariants.length === 0;
    const sku = await catalogIdentifiersService.resolveVariantSku({
      productId: input.productId,
      seed: input.variantName?.trim() || product.productName,
      requestedSku: input.sku,
    });

    const createdVariant = await this.catalogRepository.createVariant({
      ...input,
      sku,
      isDefault: shouldBeDefault,
      stockQty,
      reservedQty,
      availableQty,
    });

    if (shouldBeDefault) {
      await this.catalogRepository.clearDefaultVariantsByProduct(
        input.productId,
        createdVariant.id,
      );
      return (
        (await this.catalogRepository.updateVariant(createdVariant.id, {
          isDefault: true,
        })) ?? createdVariant
      );
    }

    return createdVariant;
  }

  async getVariantById(variantId: string) {
    assertObjectId(variantId, "variant id");
    return this.catalogRepository.findVariantById(variantId);
  }

  async listVariantsByProduct(productId: string) {
    assertObjectId(productId, "product id");
    return this.catalogRepository.listVariantsByProduct(productId);
  }

  async reserveVariantStock(variantId: string, quantity: number) {
    if (quantity <= 0) {
      throw new AppError("Quantity must be greater than zero.", 400);
    }

    const variant = await this.catalogRepository.findVariantById(variantId);

    if (!variant) {
      throw new AppError("Variant not found.", 404);
    }

    if (!variant.isActive) {
      throw new AppError("Variant is inactive.", 400);
    }

    if (!isVariantSellable(variant, quantity)) {
      throw new AppError(getVariantAvailabilityState(variant).detail, 409);
    }

    if (!variant.trackInventory) {
      return variant;
    }

    return this.catalogRepository.setVariantInventory(variantId, {
      stockQty: variant.stockQty,
      reservedQty: variant.reservedQty + quantity,
      availableQty: variant.stockQty - (variant.reservedQty + quantity),
      isActive: variant.isActive,
    });
  }

  async releaseVariantStock(variantId: string, quantity: number) {
    if (quantity <= 0) {
      throw new AppError("Quantity must be greater than zero.", 400);
    }

    const variant = await this.catalogRepository.findVariantById(variantId);

    if (!variant) {
      throw new AppError("Variant not found.", 404);
    }

    if (!variant.trackInventory) {
      return variant;
    }

    const reservedQty = Math.max(variant.reservedQty - quantity, 0);

    return this.catalogRepository.setVariantInventory(variantId, {
      stockQty: variant.stockQty,
      reservedQty,
      availableQty: variant.stockQty - reservedQty,
      isActive: variant.isActive,
    });
  }

  async confirmVariantSale(variantId: string, quantity: number) {
    if (quantity <= 0) {
      throw new AppError("Quantity must be greater than zero.", 400);
    }

    const variant = await this.catalogRepository.findVariantById(variantId);

    if (!variant) {
      throw new AppError("Variant not found.", 404);
    }

    if (!isVariantSellable(variant, quantity)) {
      throw new AppError(getVariantAvailabilityState(variant).detail, 409);
    }

    if (!variant.trackInventory) {
      return variant;
    }

    const nextStockQty = Math.max(variant.stockQty - quantity, 0);
    const nextReservedQty = Math.max(variant.reservedQty - quantity, 0);

    return this.catalogRepository.setVariantInventory(variantId, {
      stockQty: nextStockQty,
      reservedQty: nextReservedQty,
      availableQty: nextStockQty - nextReservedQty,
      isActive: variant.isActive,
    });
  }

  async receiveVariantStock(variantId: string, quantity: number) {
    if (quantity <= 0) {
      throw new AppError("Quantity must be greater than zero.", 400);
    }

    const variant = await this.catalogRepository.findVariantById(variantId);

    if (!variant) {
      throw new AppError("Variant not found.", 404);
    }

    if (!variant.trackInventory) {
      return variant;
    }

    const stockQty = variant.stockQty + quantity;

    return this.catalogRepository.setVariantInventory(variantId, {
      stockQty,
      reservedQty: variant.reservedQty,
      availableQty: stockQty - variant.reservedQty,
      isActive: variant.isActive,
    });
  }
}

export const catalogService = new CatalogService();
