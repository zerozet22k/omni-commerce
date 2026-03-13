import { notFound } from "next/navigation";

import { deleteCatalogRecordAction } from "@/app/dashboard/catalog/actions";
import {
  CategoryCommerceConfigForm,
  CategoryRecordForm,
} from "@/components/admin/catalog-forms";
import { AdminEditorPage } from "@/components/admin/editor-page";
import { CatalogTabs } from "@/components/admin/module-tabs";
import { AdminActionButton, AdminPanel, AdminSectionHeader } from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { connectToDatabase } from "@/lib/db/mongodb";
import { OptionTypeModel } from "@/modules/catalog/catalog.models";
import {
  CategoryFilterConfigModel,
  CategoryOptionTypeMapModel,
  CategorySpecMapModel,
  SpecificationDefinitionModel,
} from "@/modules/catalog/catalog-extra.models";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type CategoryDetailPageProps = {
  params: Promise<{
    categoryId: string;
  }>;
};

export default async function DashboardCatalogCategoryDetailPage({
  params,
}: CategoryDetailPageProps) {
  await requirePermission(PERMISSIONS.catalogView);
  const { categoryId } = await params;
  const workspace = await adminWorkspaceService.getSimpleRecordWorkspace("categories", {
    id: categoryId,
  });
  const record = workspace.selectedRecord;

  if (!record) {
    notFound();
  }

  await connectToDatabase();
  const [specMaps, optionMaps, filterConfigs, specDefinitions, optionTypes] =
    await Promise.all([
      CategorySpecMapModel.find({ categoryId })
        .sort({ sortOrder: 1 })
        .lean()
        .exec() as Promise<
          Array<{
            specDefinitionId?: unknown;
            isRequired?: boolean;
            isFilterable?: boolean;
            sortOrder?: number;
          }>
        >,
      CategoryOptionTypeMapModel.find({ categoryId })
        .sort({ sortOrder: 1 })
        .lean()
        .exec() as Promise<
          Array<{
            optionTypeId?: unknown;
            isRequired?: boolean;
            sortOrder?: number;
          }>
        >,
      CategoryFilterConfigModel.find({ categoryId })
        .sort({ sortOrder: 1 })
        .lean()
        .exec() as Promise<
          Array<{
            filterKey?: string;
            filterLabel?: string;
            filterSource?: string;
            optionTypeId?: unknown;
            specDefinitionId?: unknown;
            displayType?: string;
            sortOrder?: number;
            isInherited?: boolean;
            isActive?: boolean;
          }>
        >,
      SpecificationDefinitionModel.find({})
        .select("specKey specLabel valueType filterDisplayType unit")
        .lean()
        .exec() as Promise<
          Array<{
            _id: unknown;
            specKey?: string;
            specLabel?: string;
            valueType?: string;
            filterDisplayType?: string;
            unit?: string;
          }>
        >,
      OptionTypeModel.find({})
        .select("optionName")
        .lean()
        .exec() as Promise<Array<{ _id: unknown; optionName?: string }>>,
    ]);
  const specDefinitionMap = new Map(
    specDefinitions.map((definition) => [String(definition._id), definition]),
  );
  const optionTypeMap = new Map(
    optionTypes.map((optionType) => [String(optionType._id), optionType]),
  );
  const specDefinitionsText = specMaps
    .map((map) => {
      const definition = specDefinitionMap.get(String(map.specDefinitionId ?? ""));

      if (!definition) {
        return null;
      }

      return [
        definition.specKey ?? "",
        definition.specLabel ?? "",
        definition.valueType ?? "TEXT",
        definition.filterDisplayType ?? "CHECKBOX",
        map.isRequired ? "required" : "",
        map.isFilterable === false ? "false" : "true",
        String(map.sortOrder ?? 0),
        definition.unit ?? "",
      ].join("|");
    })
    .filter((value): value is string => Boolean(value))
    .join("\n");
  const categoryOptionTypesText = optionMaps
    .map((map) => {
      const optionType = optionTypeMap.get(String(map.optionTypeId ?? ""));

      if (!optionType) {
        return null;
      }

      return [
        optionType.optionName ?? "",
        map.isRequired ? "required" : "",
        String(map.sortOrder ?? 0),
      ].join("|");
    })
    .filter((value): value is string => Boolean(value))
    .join("\n");
  const categoryFiltersText = filterConfigs
    .map((config) => {
      const sourceKey =
        config.filterSource === "OPTION_TYPE"
          ? optionTypeMap.get(String(config.optionTypeId ?? ""))?.optionName ?? ""
          : config.filterSource === "SPECIFICATION"
            ? specDefinitionMap.get(String(config.specDefinitionId ?? ""))?.specKey ?? ""
            : "";

      return [
        config.filterKey ?? "",
        config.filterLabel ?? "",
        config.filterSource ?? "",
        sourceKey,
        config.displayType ?? "CHECKBOX",
        String(config.sortOrder ?? 0),
        config.isInherited === false ? "false" : "true",
        config.isActive === false ? "false" : "true",
      ].join("|");
    })
    .join("\n");

  return (
    <AdminEditorPage
      backHref="/dashboard/catalog/categories"
      backLabel="Back to categories"
      description="Edit category structure, ordering, activation state, and SEO fields from one focused record screen."
      main={
        <AdminPanel>
          <AdminSectionHeader
            title="Category record"
            description="Changes here update the live category record used across product assignment and storefront navigation."
          />
          <div className="mt-5">
            <CategoryRecordForm
              categoryOptions={workspace.categoryOptions}
              record={record}
              returnTo={`/dashboard/catalog/categories/${categoryId}`}
              submitLabel="Save category"
            />
          </div>
        </AdminPanel>
      }
      aside={
        <>
          <AdminPanel>
            <AdminSectionHeader
              title="Tree helpers"
              description="These Mongo helper fields are maintained automatically from the parent category and slug."
            />
            <div className="mt-4 space-y-2 text-sm text-text-muted">
              <p>
                <span className="font-semibold text-text">Full slug path:</span>{" "}
                {String(record.fullSlugPath ?? record.slug ?? "") || "Pending save"}
              </p>
              <p>
                <span className="font-semibold text-text">Depth:</span>{" "}
                {String(record.depth ?? 0)}
              </p>
              <p>
                <span className="font-semibold text-text">Ancestors:</span>{" "}
                {Array.isArray(record.ancestorCategoryIds) && record.ancestorCategoryIds.length > 0
                  ? record.ancestorCategoryIds.join(", ")
                  : "No ancestors"}
              </p>
            </div>
          </AdminPanel>

          <AdminPanel>
            <AdminSectionHeader
              title="Category commerce config"
              description="Configure category-specific specifications, suggested option types, and listing filters without creating a separate subcategory model."
            />
            <div className="mt-5">
              <CategoryCommerceConfigForm
                categoryFiltersText={categoryFiltersText}
                categoryId={categoryId}
                categoryOptionTypesText={categoryOptionTypesText}
                returnTo={`/dashboard/catalog/categories/${categoryId}`}
                specDefinitionsText={specDefinitionsText}
              />
            </div>
          </AdminPanel>

          <AdminPanel>
            <AdminSectionHeader
              title="Record actions"
              description="Categories already linked to products or child categories are archived instead of being deleted."
            />
            <form action={deleteCatalogRecordAction} className="mt-5">
              <input name="kind" type="hidden" value="categories" />
              <input name="recordId" type="hidden" value={String(record.id)} />
              <input name="returnTo" type="hidden" value="/dashboard/catalog/categories" />
              <AdminActionButton tone="rose">Delete or archive category</AdminActionButton>
            </form>
          </AdminPanel>
        </>
      }
      tabs={<CatalogTabs currentPath="/dashboard/catalog/categories" />}
      title="Category"
    />
  );
}
