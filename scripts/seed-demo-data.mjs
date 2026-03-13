import mongoose, { Schema } from "mongoose";
import { hash } from "bcryptjs";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import dbModule from "../src/lib/db/mongodb.ts";
import permissionsModule from "../src/lib/auth/permissions.ts";
import slugifyModule from "../src/lib/utils/slugify.ts";
import catalogModels from "../src/modules/catalog/catalog.models.ts";
import catalogExtraModels from "../src/modules/catalog/catalog-extra.models.ts";
import categoryTreeServiceModule from "../src/modules/catalog/category-tree.service.ts";
import coreModels from "../src/modules/core/core.models.ts";
import customerModels from "../src/modules/customers/customers.models.ts";
import engagementModels from "../src/modules/engagement/engagement.models.ts";
import orderModels from "../src/modules/orders/orders.models.ts";
import paymentModels from "../src/modules/payments/payments.models.ts";
import pricingModels from "../src/modules/pricing/pricing.models.ts";
import shipmentModels from "../src/modules/shipments/shipments.models.ts";
import sourcingModels from "../src/modules/sourcing/sourcing.models.ts";
import customerProfileModels from "../src/modules/users/customer-profile.model.ts";

const { connectToDatabase } = dbModule;
const { USER_ROLES } = permissionsModule;
const { slugify } = slugifyModule;
const { categoryTreeService } = categoryTreeServiceModule;
const {
  BrandModel,
  CategoryModel,
  OptionTypeModel,
  OptionValueModel,
  ProductModel,
  ProductTypeModel,
  ProductVariantModel,
  TaxClassModel,
} = catalogModels;
const {
  CategoryFilterConfigModel,
  CategoryOptionTypeMapModel,
  CategorySpecMapModel,
  CollectionModel,
  SpecificationDefinitionModel,
} = catalogExtraModels;
const { CountryModel, MediaAssetModel, StateRegionModel, StoreSettingsModel } = coreModels;
const {
  AddressModel,
  CustomerGroupMemberModel,
  CustomerGroupModel,
  SavedSearchModel,
  WishlistItemModel,
  WishlistModel,
} = customerModels;
const { RefundModel, ReturnItemModel, ReturnModel, ReviewModel } = engagementModels;
const { OrderItemModel, OrderModel, OrderNoteModel, OrderStatusLogModel } = orderModels;
const { PaymentMethodModel, PaymentModel } = paymentModels;
const {
  PromotionCustomerGroupModel,
  PromotionModel,
  PromotionProductModel,
  PromotionVariantModel,
  ShippingMethodModel,
  ShippingRateRuleModel,
  ShippingZoneCountryModel,
  ShippingZoneModel,
} = pricingModels;
const { ShipmentModel } = shipmentModels;
const {
  RestockOrderItemModel,
  RestockOrderModel,
  SourcingPlatformModel,
  SourcingSourceModel,
  StockAdjustmentModel,
  VariantSourceModel,
} = sourcingModels;
const { CustomerProfileModel } = customerProfileModels;

const userSchema = new Schema(
  {
    role: { type: String, enum: USER_ROLES, required: true, default: "CUSTOMER" },
    fullName: { type: String, required: true, trim: true, maxlength: 150 },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 200,
      sparse: true,
      unique: true,
    },
    phone: { type: String, trim: true, maxlength: 30 },
    passwordHash: { type: String, required: true, maxlength: 255, select: false },
    emailVerified: { type: Boolean, required: true, default: false },
    isActive: { type: Boolean, required: true, default: true },
    registrationDate: { type: Date, default: Date.now },
    lastLoginAt: { type: Date },
  },
  {
    collection: "users",
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  },
);

const UserModel = mongoose.models.User || mongoose.model("User", userSchema);
const DEMO_PASSWORD = "OmniDemo123!";

function at(date) {
  return new Date(`${date}T09:00:00.000Z`);
}

function placeholder(label) {
  const normalized = label.toLowerCase();

  if (
    normalized.includes("hero") ||
    normalized.includes("banner") ||
    normalized.includes("promotion")
  ) {
    return "/placeholders/store-banner.svg";
  }

  if (normalized.includes("category")) {
    return "/placeholders/store-category.svg";
  }

  return "/uploads/catalog/2026/03/shoe-crop-as-is-000e1d7f-5426-4db7-93da-50c589d923ec.png";
}

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), ".env.local");

  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex < 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function upsertOne(Model, filter, update) {
  return Model.findOneAndUpdate(filter, { $set: update }, {
    returnDocument: "after",
    upsert: true,
    setDefaultsOnInsert: true,
  }).exec();
}

async function ensureUser(input) {
  return upsertOne(
    UserModel,
    { email: input.email.toLowerCase() },
    {
      role: input.role,
      fullName: input.fullName,
      email: input.email.toLowerCase(),
      phone: input.phone,
      passwordHash: await hash(DEMO_PASSWORD, 12),
      emailVerified: true,
      isActive: true,
      registrationDate: input.registrationDate,
      lastLoginAt: input.lastLoginAt,
    },
  );
}

async function ensureCategoryTreeNode({
  categoryMap,
  assets,
  name,
  parentName,
  sortOrder,
}) {
  const parent = parentName ? categoryMap.get(parentName) ?? null : null;
  const slug = slugify(name);
  const fullSlugPath = parent?.fullSlugPath ? `${parent.fullSlugPath}/${slug}` : slug;
  const existing =
    (await CategoryModel.findOne({ fullSlugPath }).exec()) ??
    (await CategoryModel.findOne({
      slug,
      parentCategoryId: parent?._id ?? null,
    }).exec());

  const category = await categoryTreeService.saveCategory({
    categoryId: existing?.id,
    categoryName: name,
    slug,
    parentCategoryId: parent ? String(parent._id) : undefined,
    description: `${name} demo records for Omni Commerce.`,
    imageAssetId: String(assets.get(`${name} Category`)._id),
    isActive: true,
    sortOrder,
  });

  categoryMap.set(name, category);
  return category;
}

async function removeObsoleteCategoryPaths(paths) {
  const obsoleteCategories = await CategoryModel.find({
    $or: [
      { fullSlugPath: { $in: paths } },
      {
        slug: { $in: paths },
        parentCategoryId: null,
      },
    ],
  })
    .select("_id")
    .lean()
    .exec();

  if (obsoleteCategories.length === 0) {
    return;
  }

  const obsoleteIds = obsoleteCategories.map((category) => category._id);
  await Promise.all([
    CategorySpecMapModel.deleteMany({ categoryId: { $in: obsoleteIds } }).exec(),
    CategoryOptionTypeMapModel.deleteMany({ categoryId: { $in: obsoleteIds } }).exec(),
    CategoryFilterConfigModel.deleteMany({ categoryId: { $in: obsoleteIds } }).exec(),
    CategoryModel.deleteMany({ _id: { $in: obsoleteIds } }).exec(),
  ]);
}

async function main() {
  loadLocalEnv();
  await connectToDatabase();

  const assets = new Map();
  const products = new Map();
  const variants = new Map();
  const groups = new Map();
  const users = new Map();
  const addresses = new Map();
  const suppliers = new Map();
  const paymentMethods = new Map();
  const shippingMethods = new Map();

  for (const label of [
    "Omni Commerce Hero",
    "Omni Trail Pack",
    "Omni Runner One",
    "Omni City Stride",
    "Omni Base Layer Tee",
    "Omni Hydration Flask",
    "Omni Promotion Banner",
    "Shoes Category",
    "Running Category",
    "Casual Category",
    "Bags Category",
    "Apparel Category",
    "Accessories Category",
  ]) {
    assets.set(
      label,
      await upsertOne(
        MediaAssetModel,
        { url: placeholder(label) },
        {
          assetType: "IMAGE",
          url: placeholder(label),
          title: label,
          altText: label,
          mimeType: "image/png",
          width: label.includes("Hero") || label.includes("Banner") ? 1600 : 1200,
          height: label.includes("Hero") || label.includes("Banner") ? 900 : 1200,
          sizeBytes: 180000,
        },
      ),
    );
  }

  const myanmar =
    (await CountryModel.findOne({ isoCode: "MM" }).exec()) ??
    (await CountryModel.create({
      countryName: "Myanmar",
      isoCode: "MM",
      phoneCode: "+95",
    }));
  const yangon = await upsertOne(
    StateRegionModel,
    { countryId: myanmar._id, stateRegionName: "Yangon Region" },
    { countryId: myanmar._id, stateRegionName: "Yangon Region", code: "YGN" },
  );

  const store = await StoreSettingsModel.findOne().sort({ createdAt: 1 }).exec();
  if (!store) {
    await StoreSettingsModel.create({
      storeName: "Omni Commerce",
      storeSlug: "omni-commerce",
      storeEmail: "hello@omni.test",
      supportEmail: "support@omni.test",
      currencyCode: "MMK",
      locale: "en",
      timezone: "Asia/Yangon",
      logoAssetId: assets.get("Omni Commerce Hero")._id,
      heroAssetId: assets.get("Omni Commerce Hero")._id,
      isActive: true,
    });
  }

  for (const item of [
    { code: "SPORT", name: "Sport" },
    { code: "ACCESSORY", name: "Accessory" },
    { code: "APPAREL", name: "Apparel" },
  ]) {
    await upsertOne(ProductTypeModel, { code: item.code }, item);
  }
  await upsertOne(
    TaxClassModel,
    { taxClassName: "STANDARD" },
    { taxClassName: "STANDARD", description: "Standard demo tax class.", isActive: true },
  );

  const categoryMap = new Map();
  await removeObsoleteCategoryPaths(["running", "casual", "shoes"]);
  await ensureCategoryTreeNode({
    categoryMap,
    assets,
    name: "Apparel",
    sortOrder: 1,
  });
  await ensureCategoryTreeNode({
    categoryMap,
    assets,
    name: "Shoes",
    parentName: "Apparel",
    sortOrder: 1,
  });
  await ensureCategoryTreeNode({
    categoryMap,
    assets,
    name: "Running",
    parentName: "Shoes",
    sortOrder: 1,
  });
  await ensureCategoryTreeNode({
    categoryMap,
    assets,
    name: "Casual",
    parentName: "Shoes",
    sortOrder: 2,
  });
  await ensureCategoryTreeNode({
    categoryMap,
    assets,
    name: "Bags",
    sortOrder: 2,
  });
  await ensureCategoryTreeNode({
    categoryMap,
    assets,
    name: "Accessories",
    sortOrder: 3,
  });

  const brandMap = new Map();
  for (const name of ["Omni", "Summit Forge"]) {
    brandMap.set(
      name,
      await upsertOne(
        BrandModel,
        { slug: slugify(name) },
        {
          brandName: name,
          slug: slugify(name),
          description: `${name} demo brand.`,
          websiteUrl: `https://omni.test/brands/${slugify(name)}`,
          isActive: true,
          originCountryId: myanmar._id,
        },
      ),
    );
  }

  const collectionMap = new Map();
  for (const name of ["Launch 2026", "Trail Essentials"]) {
    collectionMap.set(
      name,
      await upsertOne(
        CollectionModel,
        { slug: slugify(name) },
        {
          collectionName: name,
          slug: slugify(name),
          description: `${name} demo collection.`,
          bannerAssetId: assets.get("Omni Promotion Banner")._id,
          isActive: true,
          sortOrder: collectionMap.size + 1,
        },
      ),
    );
  }

  const colorType = await upsertOne(
    OptionTypeModel,
    { optionName: "COLOR" },
    { optionName: "COLOR", displayType: "COLOR_SWATCH" },
  );
  const sizeType = await upsertOne(
    OptionTypeModel,
    { optionName: "SIZE" },
    { optionName: "SIZE", displayType: "BUTTON" },
  );
  const optionValueMap = new Map();
  for (const item of [
    { type: colorType, name: "Black", code: "BLACK", swatchHex: "#111111", sortOrder: 1 },
    { type: colorType, name: "Sand", code: "SAND", swatchHex: "#cbb89d", sortOrder: 2 },
    { type: colorType, name: "Orange", code: "ORANGE", swatchHex: "#f97316", sortOrder: 3 },
    { type: sizeType, name: "M", code: "M", sortOrder: 1 },
    { type: sizeType, name: "42", code: "42", sortOrder: 2 },
    { type: sizeType, name: "43", code: "43", sortOrder: 3 },
  ]) {
    const value = await upsertOne(
      OptionValueModel,
      { optionTypeId: item.type._id, valueName: item.name },
      {
        optionTypeId: item.type._id,
        valueName: item.name,
        valueCode: item.code,
        swatchHex: item.swatchHex,
        sortOrder: item.sortOrder,
      },
    );
    optionValueMap.set(`${item.type.optionName}:${item.name}`, value);
  }

  const specificationDefinitionMap = new Map();
  for (const item of [
    {
      specKey: "MATERIAL",
      specLabel: "Material",
      valueType: "TEXT",
      filterDisplayType: "CHECKBOX",
      unit: null,
    },
    {
      specKey: "TERRAIN",
      specLabel: "Terrain",
      valueType: "ENUM",
      filterDisplayType: "CHECKBOX",
      unit: null,
    },
    {
      specKey: "CUSHIONING",
      specLabel: "Cushioning",
      valueType: "ENUM",
      filterDisplayType: "RADIO",
      unit: null,
    },
    {
      specKey: "STYLE",
      specLabel: "Style",
      valueType: "ENUM",
      filterDisplayType: "CHECKBOX",
      unit: null,
    },
  ]) {
    const definition = await upsertOne(
      SpecificationDefinitionModel,
      { specKey: item.specKey },
      {
        specKey: item.specKey,
        specLabel: item.specLabel,
        valueType: item.valueType,
        unit: item.unit ?? undefined,
        filterDisplayType: item.filterDisplayType,
        isFilterable: true,
        isActive: true,
      },
    );
    specificationDefinitionMap.set(item.specKey, definition);
  }

  const categoryConfigIds = [
    "Apparel",
    "Shoes",
    "Running",
    "Casual",
  ].map((name) => categoryMap.get(name)?._id).filter(Boolean);
  await Promise.all([
    CategorySpecMapModel.deleteMany({ categoryId: { $in: categoryConfigIds } }).exec(),
    CategoryOptionTypeMapModel.deleteMany({ categoryId: { $in: categoryConfigIds } }).exec(),
    CategoryFilterConfigModel.deleteMany({ categoryId: { $in: categoryConfigIds } }).exec(),
  ]);

  await CategoryOptionTypeMapModel.insertMany(
    [
      { categoryId: categoryMap.get("Apparel")._id, optionTypeId: sizeType._id, isRequired: true, sortOrder: 1 },
      { categoryId: categoryMap.get("Apparel")._id, optionTypeId: colorType._id, isRequired: false, sortOrder: 2 },
      { categoryId: categoryMap.get("Running")._id, optionTypeId: sizeType._id, isRequired: true, sortOrder: 1 },
      { categoryId: categoryMap.get("Running")._id, optionTypeId: colorType._id, isRequired: false, sortOrder: 2 },
      { categoryId: categoryMap.get("Casual")._id, optionTypeId: sizeType._id, isRequired: true, sortOrder: 1 },
      { categoryId: categoryMap.get("Casual")._id, optionTypeId: colorType._id, isRequired: false, sortOrder: 2 },
    ],
    { ordered: false },
  );

  await CategorySpecMapModel.insertMany(
    [
      { categoryId: categoryMap.get("Apparel")._id, specDefinitionId: specificationDefinitionMap.get("MATERIAL")._id, isRequired: false, isFilterable: true, sortOrder: 1 },
      { categoryId: categoryMap.get("Running")._id, specDefinitionId: specificationDefinitionMap.get("TERRAIN")._id, isRequired: true, isFilterable: true, sortOrder: 1 },
      { categoryId: categoryMap.get("Running")._id, specDefinitionId: specificationDefinitionMap.get("CUSHIONING")._id, isRequired: false, isFilterable: true, sortOrder: 2 },
      { categoryId: categoryMap.get("Casual")._id, specDefinitionId: specificationDefinitionMap.get("STYLE")._id, isRequired: true, isFilterable: true, sortOrder: 1 },
      { categoryId: categoryMap.get("Casual")._id, specDefinitionId: specificationDefinitionMap.get("MATERIAL")._id, isRequired: false, isFilterable: true, sortOrder: 2 },
    ],
    { ordered: false },
  );

  await CategoryFilterConfigModel.insertMany(
    [
      { categoryId: categoryMap.get("Apparel")._id, filterKey: "brand", filterLabel: "Brand", filterSource: "BRAND", displayType: "CHECKBOX", sortOrder: 1, isActive: true, isInherited: true },
      { categoryId: categoryMap.get("Apparel")._id, filterKey: "price", filterLabel: "Price", filterSource: "PRICE", displayType: "RANGE", sortOrder: 2, isActive: true, isInherited: true },
      { categoryId: categoryMap.get("Apparel")._id, filterKey: "size", filterLabel: "Size", filterSource: "OPTION_TYPE", optionTypeId: sizeType._id, displayType: "CHECKBOX", sortOrder: 3, isActive: true, isInherited: false },
      { categoryId: categoryMap.get("Apparel")._id, filterKey: "color", filterLabel: "Color", filterSource: "OPTION_TYPE", optionTypeId: colorType._id, displayType: "COLOR_SWATCH", sortOrder: 4, isActive: true, isInherited: false },
      { categoryId: categoryMap.get("Apparel")._id, filterKey: "material", filterLabel: "Material", filterSource: "SPECIFICATION", specDefinitionId: specificationDefinitionMap.get("MATERIAL")._id, displayType: "CHECKBOX", sortOrder: 5, isActive: true, isInherited: false },
      { categoryId: categoryMap.get("Shoes")._id, filterKey: "brand", filterLabel: "Brand", filterSource: "BRAND", displayType: "CHECKBOX", sortOrder: 1, isActive: true, isInherited: true },
      { categoryId: categoryMap.get("Shoes")._id, filterKey: "price", filterLabel: "Price", filterSource: "PRICE", displayType: "RANGE", sortOrder: 2, isActive: true, isInherited: true },
      { categoryId: categoryMap.get("Shoes")._id, filterKey: "size", filterLabel: "Size", filterSource: "OPTION_TYPE", optionTypeId: sizeType._id, displayType: "CHECKBOX", sortOrder: 3, isActive: true, isInherited: true },
      { categoryId: categoryMap.get("Shoes")._id, filterKey: "color", filterLabel: "Color", filterSource: "OPTION_TYPE", optionTypeId: colorType._id, displayType: "COLOR_SWATCH", sortOrder: 4, isActive: true, isInherited: true },
      { categoryId: categoryMap.get("Running")._id, filterKey: "terrain", filterLabel: "Terrain", filterSource: "SPECIFICATION", specDefinitionId: specificationDefinitionMap.get("TERRAIN")._id, displayType: "CHECKBOX", sortOrder: 5, isActive: true, isInherited: false },
      { categoryId: categoryMap.get("Running")._id, filterKey: "cushioning", filterLabel: "Cushioning", filterSource: "SPECIFICATION", specDefinitionId: specificationDefinitionMap.get("CUSHIONING")._id, displayType: "RADIO", sortOrder: 6, isActive: true, isInherited: false },
      { categoryId: categoryMap.get("Casual")._id, filterKey: "style", filterLabel: "Style", filterSource: "SPECIFICATION", specDefinitionId: specificationDefinitionMap.get("STYLE")._id, displayType: "CHECKBOX", sortOrder: 5, isActive: true, isInherited: false },
      { categoryId: categoryMap.get("Casual")._id, filterKey: "material", filterLabel: "Material", filterSource: "SPECIFICATION", specDefinitionId: specificationDefinitionMap.get("MATERIAL")._id, displayType: "CHECKBOX", sortOrder: 6, isActive: true, isInherited: false },
    ],
    { ordered: false },
  );

  const shippingZone = await upsertOne(
    ShippingZoneModel,
    { zoneName: "Myanmar Delivery" },
    { zoneName: "Myanmar Delivery", description: "Demo shipping zone.", isActive: true },
  );
  await upsertOne(
    ShippingZoneCountryModel,
    { shippingZoneId: shippingZone._id, countryId: myanmar._id },
    { shippingZoneId: shippingZone._id, countryId: myanmar._id },
  );
  for (const item of [
    { code: "STANDARD", methodName: "Standard Delivery", baseFee: 3500, fee: 3500 },
    { code: "EXPRESS", methodName: "Express Delivery", baseFee: 5500, fee: 5500 },
  ]) {
    const method = await upsertOne(
      ShippingMethodModel,
      { code: item.code },
      {
        shippingZoneId: shippingZone._id,
        methodName: item.methodName,
        code: item.code,
        baseFee: item.baseFee,
        isActive: true,
      },
    );
    shippingMethods.set(item.code, method);
    await upsertOne(
      ShippingRateRuleModel,
      { shippingMethodId: method._id, minOrderAmount: 0, maxOrderAmount: 9999999 },
      {
        shippingMethodId: method._id,
        minOrderAmount: 0,
        maxOrderAmount: 9999999,
        fee: item.fee,
        isActive: true,
      },
    );
  }

  for (const item of [
    { code: "COD", methodName: "Cash on Delivery", provider: "Manual", isManual: true },
    { code: "KBZPAY", methodName: "KBZPay", provider: "KBZPay", isManual: false },
  ]) {
    paymentMethods.set(
      item.code,
      await upsertOne(PaymentMethodModel, { code: item.code }, { ...item, isActive: true }),
    );
  }

  for (const item of [
    { name: "VIP", description: "High value repeat buyers." },
    { name: "RETAIL", description: "Standard retail buyers." },
  ]) {
    groups.set(
      item.name,
      await upsertOne(
        CustomerGroupModel,
        { groupName: item.name },
        { groupName: item.name, description: item.description, isActive: true },
      ),
    );
  }

  for (const item of [
    {
      key: "admin",
      role: "ADMIN",
      fullName: "Aye Admin",
      email: "admin@omni.test",
      phone: "+95 9 700 000 002",
      registrationDate: at("2026-01-03"),
      lastLoginAt: at("2026-03-10"),
    },
    {
      key: "staff",
      role: "STAFF",
      fullName: "Min Staff",
      email: "staff@omni.test",
      phone: "+95 9 700 000 003",
      registrationDate: at("2026-01-05"),
      lastLoginAt: at("2026-03-09"),
    },
    {
      key: "nora",
      role: "CUSTOMER",
      fullName: "Nora Chan",
      email: "nora@omni.test",
      phone: "+95 9 880 000 101",
      registrationDate: at("2026-01-08"),
      lastLoginAt: at("2026-03-08"),
    },
    {
      key: "aung",
      role: "CUSTOMER",
      fullName: "Aung Kyaw",
      email: "aung@omni.test",
      phone: "+95 9 880 000 102",
      registrationDate: at("2026-01-12"),
      lastLoginAt: at("2026-03-07"),
    },
  ]) {
    users.set(item.key, await ensureUser(item));
  }

  await upsertOne(
    CustomerProfileModel,
    { userId: users.get("nora")._id },
    { userId: users.get("nora")._id, loyaltyPoints: 900, totalSpent: 94400, totalOrders: 2 },
  );
  await upsertOne(
    CustomerProfileModel,
    { userId: users.get("aung")._id },
    { userId: users.get("aung")._id, loyaltyPoints: 300, totalSpent: 130000, totalOrders: 1 },
  );

  addresses.set(
    "nora",
    await upsertOne(
      AddressModel,
      { userId: users.get("nora")._id, label: "Home" },
      {
        userId: users.get("nora")._id,
        label: "Home",
        receiverName: "Nora Chan",
        receiverPhone: "+95 9 880 000 101",
        countryId: myanmar._id,
        stateRegionId: yangon._id,
        city: "Yangon",
        township: "Sanchaung",
        addressLine1: "No. 21, Baho Road",
        addressLine2: "Floor 3",
        isDefaultShipping: true,
        isDefaultBilling: true,
      },
    ),
  );
  addresses.set(
    "aung",
    await upsertOne(
      AddressModel,
      { userId: users.get("aung")._id, label: "Home" },
      {
        userId: users.get("aung")._id,
        label: "Home",
        receiverName: "Aung Kyaw",
        receiverPhone: "+95 9 880 000 102",
        countryId: myanmar._id,
        stateRegionId: yangon._id,
        city: "Yangon",
        township: "Kamaryut",
        addressLine1: "No. 5, Pyay Road",
        addressLine2: "Room 4A",
        isDefaultShipping: true,
        isDefaultBilling: true,
      },
    ),
  );

  await upsertOne(
    CustomerGroupMemberModel,
    { customerGroupId: groups.get("VIP")._id, userId: users.get("nora")._id },
    { customerGroupId: groups.get("VIP")._id, userId: users.get("nora")._id, joinedAt: at("2026-01-15") },
  );
  await upsertOne(
    CustomerGroupMemberModel,
    { customerGroupId: groups.get("RETAIL")._id, userId: users.get("aung")._id },
    { customerGroupId: groups.get("RETAIL")._id, userId: users.get("aung")._id, joinedAt: at("2026-01-15") },
  );

  const taobao = await upsertOne(
    SourcingPlatformModel,
    { code: "TAOBAO" },
    { code: "TAOBAO", name: "Taobao", isActive: true },
  );
  const localVendor = await upsertOne(
    SourcingPlatformModel,
    { code: "LOCAL_VENDOR" },
    { code: "LOCAL_VENDOR", name: "Local Vendor", isActive: true },
  );
  suppliers.set(
    "pack-lab",
    await upsertOne(
      SourcingSourceModel,
      { sourcingPlatformId: taobao._id, sourceName: "Hangzhou Pack Lab" },
      {
        sourcingPlatformId: taobao._id,
        sourceName: "Hangzhou Pack Lab",
        contactName: "Wen Zhao",
        phone: "+86 188 0000 0001",
        email: "hangzhou-pack-lab@example.test",
        shopUrl: "https://supplier.example/hangzhou-pack-lab",
        note: "Primary pack supplier.",
        isActive: true,
      },
    ),
  );
  suppliers.set(
    "yangon-outdoor",
    await upsertOne(
      SourcingSourceModel,
      { sourcingPlatformId: localVendor._id, sourceName: "Yangon Outdoor Supply" },
      {
        sourcingPlatformId: localVendor._id,
        sourceName: "Yangon Outdoor Supply",
        contactName: "Ko Naing",
        phone: "+95 9 500 400 300",
        email: "yangon-outdoor@example.test",
        shopUrl: "https://supplier.example/yangon-outdoor-supply",
        note: "Local replenishment source.",
        isActive: true,
      },
    ),
  );

  const productDefs = [
    {
      slug: "omni-trail-pack",
      name: "Omni Trail Pack",
      productTypeId: "ACCESSORY",
      categoryId: "Bags",
      brandId: "Omni",
      collectionIds: ["Launch 2026", "Trail Essentials"],
      optionTypeIds: [colorType._id],
      image: "Omni Trail Pack",
      variants: [
        { sku: "OMNI-TRAILPACK-BLK", name: "Black", price: 65000, stock: 24, reserved: 1, options: ["COLOR:Black"], default: true },
        { sku: "OMNI-TRAILPACK-SAND", name: "Sand", price: 65000, stock: 8, reserved: 0, options: ["COLOR:Sand"], default: false },
      ],
    },
    {
      slug: "omni-runner-one",
      name: "Omni Runner One",
      productTypeId: "SPORT",
      categoryId: "Running",
      brandId: "Summit Forge",
      collectionIds: ["Launch 2026"],
      optionTypeIds: [colorType._id, sizeType._id],
      image: "Omni Runner One",
      specifications: [
        { specGroup: "Performance", specKey: "TERRAIN", specDefinitionKey: "TERRAIN", specValue: "Road" },
        { specGroup: "Performance", specKey: "CUSHIONING", specDefinitionKey: "CUSHIONING", specValue: "High" },
      ],
      variants: [
        { sku: "OMNI-RUNNER-42-BLK", name: "Black / 42", price: 125000, stock: 18, reserved: 2, options: ["COLOR:Black", "SIZE:42"], default: true },
        { sku: "OMNI-RUNNER-43-BLK", name: "Black / 43", price: 125000, stock: 10, reserved: 1, options: ["COLOR:Black", "SIZE:43"], default: false },
      ],
    },
    {
      slug: "omni-city-stride",
      name: "Omni City Stride",
      productTypeId: "SPORT",
      categoryId: "Casual",
      brandId: "Omni",
      collectionIds: ["Launch 2026"],
      optionTypeIds: [colorType._id, sizeType._id],
      image: "Omni City Stride",
      specifications: [
        { specGroup: "Lifestyle", specKey: "STYLE", specDefinitionKey: "STYLE", specValue: "Everyday" },
        { specGroup: "Materials", specKey: "MATERIAL", specDefinitionKey: "MATERIAL", specValue: "Canvas" },
      ],
      variants: [
        { sku: "OMNI-CITY-42-BLK", name: "Black / 42", price: 98000, stock: 12, reserved: 1, options: ["COLOR:Black", "SIZE:42"], default: true },
        { sku: "OMNI-CITY-42-SAND", name: "Sand / 42", price: 98000, stock: 7, reserved: 0, options: ["COLOR:Sand", "SIZE:42"], default: false },
      ],
    },
    {
      slug: "omni-base-layer-tee",
      name: "Omni Base Layer Tee",
      productTypeId: "APPAREL",
      categoryId: "Apparel",
      brandId: "Omni",
      collectionIds: ["Trail Essentials"],
      optionTypeIds: [colorType._id, sizeType._id],
      image: "Omni Base Layer Tee",
      specifications: [
        { specGroup: "Materials", specKey: "MATERIAL", specDefinitionKey: "MATERIAL", specValue: "Polyester blend" },
      ],
      variants: [
        { sku: "OMNI-TEE-BLK-M", name: "Black / M", price: 32000, stock: 30, reserved: 0, options: ["COLOR:Black", "SIZE:M"], default: true },
        { sku: "OMNI-TEE-ORG-M", name: "Orange / M", price: 32000, stock: 0, reserved: 0, options: ["COLOR:Orange", "SIZE:M"], default: false },
      ],
    },
    {
      slug: "omni-hydration-flask",
      name: "Omni Hydration Flask",
      productTypeId: "ACCESSORY",
      categoryId: "Accessories",
      brandId: "Summit Forge",
      collectionIds: ["Trail Essentials"],
      optionTypeIds: [],
      image: "Omni Hydration Flask",
      specifications: [
        { specGroup: "Materials", specKey: "MATERIAL", specDefinitionKey: "MATERIAL", specValue: "Stainless steel" },
      ],
      variants: [
        { sku: "OMNI-FLASK-650", name: "650ml", price: 18000, stock: 44, reserved: 0, options: [], default: true },
      ],
    },
  ];

  for (const item of productDefs) {
    const product = await upsertOne(
      ProductModel,
      { slug: item.slug },
      {
        productName: item.name,
        slug: item.slug,
        productTypeId: (await ProductTypeModel.findOne({ code: item.productTypeId }).exec())._id,
        categoryId: categoryMap.get(item.categoryId)._id,
        brandId: brandMap.get(item.brandId)._id,
        taxClassId: (await TaxClassModel.findOne({ taxClassName: "STANDARD" }).exec())._id,
        originCountryId: myanmar._id,
        shortDescription: `${item.name} seeded for dashboard demos.`,
        description: `${item.name} has realistic dummy records for catalog, order, and inventory screens.`,
        material: "Demo material",
        careInstructions: "Demo care instructions.",
        warrantyInfo: "Demo warranty.",
        status: "ACTIVE",
        visibility: "PUBLIC",
        isFeatured: item.slug === "omni-trail-pack",
        isNewArrival: true,
        isBestSeller: item.slug !== "omni-base-layer-tee",
        publishedAt: at("2026-01-20"),
        viewCount: 50,
        soldCount: 10,
        collectionIds: item.collectionIds.map((name) => collectionMap.get(name)._id),
        optionTypeIds: item.optionTypeIds,
        specifications: (item.specifications ?? []).map((specification, index) => ({
          specGroup: specification.specGroup,
          specKey: specification.specKey,
          specValue: specification.specValue,
          specDefinitionId: specificationDefinitionMap.get(specification.specDefinitionKey)?._id,
          sortOrder: index,
        })),
        images: [{ assetId: assets.get(item.image)._id, sortOrder: 0, isPrimary: true }],
      },
    );
    products.set(item.slug, product);

    let defaultVariantId = null;
    for (const variant of item.variants) {
      const record = await upsertOne(
        ProductVariantModel,
        { sku: variant.sku },
        {
          productId: product._id,
          sku: variant.sku,
          variantName: variant.name,
          unitPrice: variant.price,
          compareAtPrice: variant.price + 8000,
          costPrice: Math.round(variant.price * 0.6),
          currencyCode: "MMK",
          stockQty: variant.stock,
          reservedQty: variant.reserved,
          availableQty: variant.stock - variant.reserved,
          lowStockThreshold: 4,
          trackInventory: true,
          allowBackorder: false,
          isDefault: variant.default,
          isActive: true,
          optionValueIds: variant.options.map((key) => optionValueMap.get(key)._id),
          images: [{ assetId: assets.get(item.image)._id, sortOrder: 0, isPrimary: true }],
        },
      );
      variants.set(variant.sku, record);
      if (variant.default) defaultVariantId = record._id;
    }
    if (defaultVariantId) {
      await ProductVariantModel.updateMany(
        { productId: product._id, _id: { $ne: defaultVariantId } },
        { isDefault: false },
      ).exec();
    }
  }

  for (const item of [
    { sku: "OMNI-TRAILPACK-BLK", source: "pack-lab", url: "https://supplier.example/hangzhou-pack-lab/trail-pack-black", price: 38, sourceSku: "HZ-PACK-BLK-20L" },
    { sku: "OMNI-TRAILPACK-SAND", source: "pack-lab", url: "https://supplier.example/hangzhou-pack-lab/trail-pack-sand", price: 38, sourceSku: "HZ-PACK-SAND-20L" },
    { sku: "OMNI-FLASK-650", source: "yangon-outdoor", url: "https://supplier.example/yangon-outdoor-supply/flask-650", price: 8, sourceSku: "YGN-FLASK-650" },
  ]) {
    await upsertOne(
      VariantSourceModel,
      { variantId: variants.get(item.sku)._id, sourcingSourceId: suppliers.get(item.source)._id, sourceProductUrl: item.url },
      {
        variantId: variants.get(item.sku)._id,
        sourcingSourceId: suppliers.get(item.source)._id,
        sourceSku: item.sourceSku,
        sourceProductName: item.sku,
        sourceProductUrl: item.url,
        sourcePrice: item.price,
        sourceCurrencyCode: "CNY",
        minOrderQty: 1,
        isPreferred: true,
        isActive: true,
        lastCheckedAt: at("2026-03-01"),
      },
    );
  }

  const packSource = await VariantSourceModel.findOne({ variantId: variants.get("OMNI-TRAILPACK-SAND")._id }).exec();
  await upsertOne(
    RestockOrderModel,
    { restockNo: "RST-DEMO-0001" },
    {
      sourcingSourceId: suppliers.get("pack-lab")._id,
      restockNo: "RST-DEMO-0001",
      status: "IN_TRANSIT",
      orderDate: at("2026-03-03"),
      expectedArrivalAt: at("2026-03-15"),
      trackingNo: "OMNI-INBOUND-3021",
      currencyCode: "CNY",
      subtotal: 228,
      shippingFee: 22,
      extraFee: 8,
      grandTotal: 258,
      note: "Demo inbound replenishment.",
      createdBy: users.get("staff")._id,
    },
  );
  const restock = await RestockOrderModel.findOne({ restockNo: "RST-DEMO-0001" }).exec();
  await upsertOne(
    RestockOrderItemModel,
    { restockOrderId: restock._id, variantId: variants.get("OMNI-TRAILPACK-SAND")._id },
    {
      restockOrderId: restock._id,
      variantId: variants.get("OMNI-TRAILPACK-SAND")._id,
      variantSourceId: packSource?._id,
      sourceSkuSnapshot: "HZ-PACK-SAND-20L",
      sourceProductNameSnapshot: "Trail Pack 20L Sand",
      sourceProductUrlSnapshot: "https://supplier.example/hangzhou-pack-lab/trail-pack-sand",
      orderedQty: 6,
      receivedQty: 0,
      rejectedQty: 0,
      unitCost: 38,
      lineTotal: 228,
    },
  );
  await upsertOne(
    StockAdjustmentModel,
    { variantId: variants.get("OMNI-TEE-ORG-M")._id, adjustmentType: "CORRECTION", createdAt: at("2026-03-04") },
    {
      variantId: variants.get("OMNI-TEE-ORG-M")._id,
      adjustmentType: "CORRECTION",
      quantity: -2,
      note: "Demo shrinkage adjustment.",
      createdBy: users.get("staff")._id,
      createdAt: at("2026-03-04"),
    },
  );

  for (const item of [
    { code: "OMNI10", name: "Omni 10% Launch Coupon", type: "COUPON", discountType: "PERCENT", discountValue: 10, usageCount: 1, productSlugs: ["omni-trail-pack"], variantSkus: [], groupNames: ["VIP"] },
    { code: "TRAIL15", name: "Trail Essentials 15%", type: "AUTO_DISCOUNT", discountType: "PERCENT", discountValue: 15, usageCount: 0, productSlugs: [], variantSkus: ["OMNI-FLASK-650"], groupNames: ["RETAIL"] },
  ]) {
    const promo = await upsertOne(
      PromotionModel,
      { code: item.code },
      {
        code: item.code,
        name: item.name,
        description: `${item.name} dummy promotion.`,
        promotionType: item.type,
        discountType: item.discountType,
        discountValue: item.discountValue,
        minOrderAmount: 50000,
        maxDiscountAmount: 15000,
        usageLimit: 250,
        usageCount: item.usageCount,
        perCustomerLimit: 2,
        startsAt: at("2026-01-15"),
        endsAt: at("2026-04-30"),
        heroAssetId: assets.get("Omni Promotion Banner")._id,
        isActive: true,
      },
    );
    await Promise.all([
      PromotionProductModel.deleteMany({ promotionId: promo._id }).exec(),
      PromotionVariantModel.deleteMany({ promotionId: promo._id }).exec(),
      PromotionCustomerGroupModel.deleteMany({ promotionId: promo._id }).exec(),
    ]);
    if (item.productSlugs.length) {
      await PromotionProductModel.insertMany(item.productSlugs.map((slug) => ({ promotionId: promo._id, productId: products.get(slug)._id })), { ordered: false });
    }
    if (item.variantSkus.length) {
      await PromotionVariantModel.insertMany(item.variantSkus.map((sku) => ({ promotionId: promo._id, variantId: variants.get(sku)._id })), { ordered: false });
    }
    if (item.groupNames.length) {
      await PromotionCustomerGroupModel.insertMany(item.groupNames.map((name) => ({ promotionId: promo._id, customerGroupId: groups.get(name)._id })), { ordered: false });
    }
  }

  const order1 = await upsertOne(
    OrderModel,
    { orderNo: "OMNI-1001" },
    {
      customerId: users.get("nora")._id,
      orderNo: "OMNI-1001",
      orderDate: at("2026-01-18"),
      status: "COMPLETED",
      paymentStatus: "CONFIRMED",
      fulfillmentStatus: "DELIVERED",
      currencyCode: "MMK",
      subtotal: 101000,
      discountTotal: 10100,
      shippingFee: 3500,
      taxTotal: 0,
      giftCardTotal: 0,
      grandTotal: 94400,
      couponCode: "OMNI10",
      customerNameSnapshot: "Nora Chan",
      customerEmailSnapshot: "nora@omni.test",
      customerPhoneSnapshot: "+95 9 880 000 101",
      shippingAddressId: addresses.get("nora")._id,
      billingAddressId: addresses.get("nora")._id,
      shippingMethodId: shippingMethods.get("STANDARD")._id,
      note: "VIP launch order.",
      placedAt: at("2026-01-18"),
      paidAt: at("2026-01-18"),
      completedAt: at("2026-01-22"),
    },
  );
  const order1Trail = await upsertOne(
    OrderItemModel,
    { orderId: order1._id, skuSnapshot: "OMNI-TRAILPACK-BLK" },
    {
      orderId: order1._id,
      productId: products.get("omni-trail-pack")._id,
      variantId: variants.get("OMNI-TRAILPACK-BLK")._id,
      productNameSnapshot: "Omni Trail Pack",
      productSlugSnapshot: "omni-trail-pack",
      skuSnapshot: "OMNI-TRAILPACK-BLK",
      variantLabelSnapshot: "Black",
      thumbnailUrlSnapshot: placeholder("Omni Trail Pack"),
      quantity: 1,
      unitPrice: 65000,
      discountAmount: 6500,
      taxAmount: 0,
      lineTotal: 58500,
    },
  );
  await upsertOne(
    OrderItemModel,
    { orderId: order1._id, skuSnapshot: "OMNI-FLASK-650" },
    {
      orderId: order1._id,
      productId: products.get("omni-hydration-flask")._id,
      variantId: variants.get("OMNI-FLASK-650")._id,
      productNameSnapshot: "Omni Hydration Flask",
      productSlugSnapshot: "omni-hydration-flask",
      skuSnapshot: "OMNI-FLASK-650",
      variantLabelSnapshot: "650ml",
      thumbnailUrlSnapshot: placeholder("Omni Hydration Flask"),
      quantity: 2,
      unitPrice: 18000,
      discountAmount: 3600,
      taxAmount: 0,
      lineTotal: 32400,
    },
  );
  await upsertOne(PaymentModel, { orderId: order1._id }, {
    orderId: order1._id,
    paymentMethodId: paymentMethods.get("KBZPAY")._id,
    amount: 94400,
    currencyCode: "MMK",
    transactionRef: "KBZ-DEMO-1001",
    status: "CONFIRMED",
    paymentDate: at("2026-01-18"),
    confirmedAt: at("2026-01-18"),
    confirmedBy: users.get("admin")._id,
  });
  await upsertOne(ShipmentModel, { orderId: order1._id }, {
    orderId: order1._id,
    shippingMethodId: shippingMethods.get("STANDARD")._id,
    courierName: "YGN Express",
    trackingNo: "YGN-TRACK-1001",
    status: "DELIVERED",
    shippedAt: at("2026-01-19"),
    deliveredAt: at("2026-01-22"),
    shippingFee: 3500,
    note: "Delivered successfully.",
  });
  await upsertOne(OrderStatusLogModel, { orderId: order1._id, toStatus: "COMPLETED" }, {
    orderId: order1._id,
    fromStatus: "PAID",
    toStatus: "COMPLETED",
    note: "Shipment delivered.",
    changedBy: users.get("staff")._id,
    changedAt: at("2026-01-22"),
  });
  await upsertOne(OrderNoteModel, { orderId: order1._id, note: "VIP launch order." }, {
    orderId: order1._id,
    noteType: "INTERNAL",
    note: "VIP launch order.",
    createdBy: users.get("staff")._id,
    createdAt: at("2026-01-18"),
  });

  const order2 = await upsertOne(
    OrderModel,
    { orderNo: "OMNI-1002" },
    {
      customerId: users.get("aung")._id,
      orderNo: "OMNI-1002",
      orderDate: at("2026-02-20"),
      status: "REFUNDED",
      paymentStatus: "REFUNDED",
      fulfillmentStatus: "DELIVERED",
      currencyCode: "MMK",
      subtotal: 32000,
      discountTotal: 0,
      shippingFee: 3000,
      taxTotal: 0,
      giftCardTotal: 0,
      grandTotal: 35000,
      customerNameSnapshot: "Aung Kyaw",
      customerEmailSnapshot: "aung@omni.test",
      customerPhoneSnapshot: "+95 9 880 000 102",
      shippingAddressId: addresses.get("aung")._id,
      billingAddressId: addresses.get("aung")._id,
      shippingMethodId: shippingMethods.get("STANDARD")._id,
      note: "Refunded size issue order.",
      placedAt: at("2026-02-20"),
      paidAt: at("2026-02-20"),
      completedAt: at("2026-02-24"),
    },
  );
  const order2Item = await upsertOne(
    OrderItemModel,
    { orderId: order2._id, skuSnapshot: "OMNI-TEE-ORG-M" },
    {
      orderId: order2._id,
      productId: products.get("omni-base-layer-tee")._id,
      variantId: variants.get("OMNI-TEE-ORG-M")._id,
      productNameSnapshot: "Omni Base Layer Tee",
      productSlugSnapshot: "omni-base-layer-tee",
      skuSnapshot: "OMNI-TEE-ORG-M",
      variantLabelSnapshot: "Orange / M",
      thumbnailUrlSnapshot: placeholder("Omni Base Layer Tee"),
      quantity: 1,
      unitPrice: 32000,
      discountAmount: 0,
      taxAmount: 0,
      lineTotal: 32000,
    },
  );
  const order2Payment = await upsertOne(PaymentModel, { orderId: order2._id }, {
    orderId: order2._id,
    paymentMethodId: paymentMethods.get("KBZPAY")._id,
    amount: 35000,
    currencyCode: "MMK",
    transactionRef: "KBZ-DEMO-1002",
    status: "REFUNDED",
    paymentDate: at("2026-02-20"),
    confirmedAt: at("2026-02-20"),
    confirmedBy: users.get("admin")._id,
  });
  await upsertOne(ShipmentModel, { orderId: order2._id }, {
    orderId: order2._id,
    shippingMethodId: shippingMethods.get("STANDARD")._id,
    courierName: "YGN Express",
    trackingNo: "YGN-TRACK-1002",
    status: "RETURNED",
    shippedAt: at("2026-02-21"),
    deliveredAt: at("2026-02-24"),
    shippingFee: 3000,
    note: "Delivered and later returned.",
  });
  const returnDoc = await upsertOne(ReturnModel, { returnNo: "RET-1002" }, {
    orderId: order2._id,
    customerId: users.get("aung")._id,
    returnNo: "RET-1002",
    status: "REFUNDED",
    reason: "Wanted a different size.",
    note: "Dummy return for staff and customer pages.",
    requestedAt: at("2026-02-26"),
    approvedAt: at("2026-02-27"),
    receivedAt: at("2026-02-28"),
    closedAt: at("2026-03-01"),
  });
  await upsertOne(ReturnItemModel, { returnId: returnDoc._id, orderItemId: order2Item._id }, {
    returnId: returnDoc._id,
    orderItemId: order2Item._id,
    quantity: 1,
    reason: "Size mismatch",
    conditionNote: "Returned unworn.",
  });
  await upsertOne(RefundModel, { returnId: returnDoc._id }, {
    orderId: order2._id,
    paymentId: order2Payment._id,
    returnId: returnDoc._id,
    amount: 32000,
    currencyCode: "MMK",
    status: "PAID",
    reason: "Approved return.",
    createdAt: at("2026-02-27"),
    processedAt: at("2026-03-01"),
    processedBy: users.get("admin")._id,
  });

  await upsertOne(ReviewModel, { productId: products.get("omni-trail-pack")._id, customerId: users.get("nora")._id }, {
    productId: products.get("omni-trail-pack")._id,
    customerId: users.get("nora")._id,
    orderItemId: order1Trail._id,
    rating: 5,
    title: "Great for short trips",
    comment: "Stable on the shoulders and easy to pack.",
    isVerifiedPurchase: true,
    isVisible: true,
  });
  await ProductModel.findByIdAndUpdate(products.get("omni-trail-pack")._id, { avgRating: 5, reviewCount: 1 }).exec();

  const wishlist = await upsertOne(WishlistModel, { customerId: users.get("nora")._id }, { customerId: users.get("nora")._id });
  await upsertOne(WishlistItemModel, { wishlistId: wishlist._id, productId: products.get("omni-runner-one")._id }, {
    wishlistId: wishlist._id,
    productId: products.get("omni-runner-one")._id,
    createdAt: at("2026-03-05"),
  });
  await upsertOne(SavedSearchModel, { customerId: users.get("nora")._id, searchQuery: "trail pack" }, {
    customerId: users.get("nora")._id,
    searchQuery: "trail pack",
    filtersJson: JSON.stringify({ collection: "Trail Essentials" }),
    createdAt: at("2026-03-07"),
  });

  const counts = await Promise.all([
    ProductModel.countDocuments().exec(),
    ProductVariantModel.countDocuments().exec(),
    OrderModel.countDocuments().exec(),
    ReturnModel.countDocuments().exec(),
    PromotionModel.countDocuments().exec(),
    SourcingSourceModel.countDocuments().exec(),
    UserModel.countDocuments().exec(),
  ]);

  console.log("");
  console.log("Demo data seeded.");
  console.log(`Products: ${counts[0]}`);
  console.log(`Variants: ${counts[1]}`);
  console.log(`Orders: ${counts[2]}`);
  console.log(`Returns: ${counts[3]}`);
  console.log(`Promotions: ${counts[4]}`);
  console.log(`Suppliers: ${counts[5]}`);
  console.log(`Users: ${counts[6]}`);
  console.log("");
  console.log(`Demo password: ${DEMO_PASSWORD}`);
  console.log("Demo logins: admin@omni.test, staff@omni.test, nora@omni.test, aung@omni.test");

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
