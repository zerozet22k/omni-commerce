import { connectToDatabase } from "@/lib/db/mongodb";
import { slugify } from "@/lib/utils/slugify";
import { categoryTreeService } from "@/modules/catalog/category-tree.service";
import { CategoryModel, ProductTypeModel, TaxClassModel } from "@/modules/catalog/catalog.models";
import { CountryModel } from "@/modules/core/core.models";
import { PaymentMethodModel } from "@/modules/payments/payments.models";

export class SetupService {
  async ensureBaseCommerceSetup() {
    await connectToDatabase();

    const country =
      (await CountryModel.findOne({ isoCode: "MM" }).exec()) ??
      (await CountryModel.create({
        countryName: "Myanmar",
        isoCode: "MM",
        phoneCode: "+95",
      }));

    const categorySlug = slugify("General");
    const category =
      (await CategoryModel.findOne({ fullSlugPath: categorySlug }).exec()) ??
      (await CategoryModel.findOne({ slug: categorySlug, parentCategoryId: null }).exec()) ??
      (await categoryTreeService.saveCategory({
        categoryName: "General",
        slug: categorySlug,
        description: "Default category for new catalog items.",
        isActive: true,
        sortOrder: 0,
      }));

    const productType =
      (await ProductTypeModel.findOne({ code: "ACCESSORY" }).exec()) ??
      (await ProductTypeModel.create({
        code: "ACCESSORY",
        name: "Accessory",
      }));

    const taxClass =
      (await TaxClassModel.findOne({ taxClassName: "STANDARD" }).exec()) ??
      (await TaxClassModel.create({
        taxClassName: "STANDARD",
        description: "Default standard tax handling.",
        isActive: true,
      }));

    const paymentMethod =
      (await PaymentMethodModel.findOne({ code: "COD" }).exec()) ??
      (await PaymentMethodModel.create({
        code: "COD",
        methodName: "Cash on Delivery",
        provider: "Manual",
        isManual: true,
        isActive: true,
      }));

    return {
      countryId: country.id,
      categoryId: category.id,
      productTypeId: productType.id,
      taxClassId: taxClass.id,
      paymentMethodId: paymentMethod.id,
    };
  }
}

export const setupService = new SetupService();
