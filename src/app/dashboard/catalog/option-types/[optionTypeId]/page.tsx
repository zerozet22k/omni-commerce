import { notFound } from "next/navigation";

import {
  deleteOptionTypeAction,
  deleteOptionValueAction,
  saveOptionValueAction,
} from "@/app/dashboard/catalog/actions";
import { OptionTypeForm } from "@/components/admin/catalog-forms";
import { AdminEditorPage } from "@/components/admin/editor-page";
import { CatalogTabs } from "@/components/admin/module-tabs";
import {
  AdminActionButton,
  AdminBadge,
  AdminEmptyState,
  AdminField,
  AdminInlineHint,
  AdminPanel,
  AdminSectionHeader,
} from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { adminWorkspaceService } from "@/modules/admin/admin-workspace.service";

type OptionTypeDetailPageProps = {
  params: Promise<{
    optionTypeId: string;
  }>;
};

export default async function DashboardCatalogOptionTypeDetailPage({
  params,
}: OptionTypeDetailPageProps) {
  await requirePermission(PERMISSIONS.catalogView);
  const { optionTypeId } = await params;
  const workspace = await adminWorkspaceService.getOptionTypesWorkspace({
    id: optionTypeId,
  });
  const optionType = workspace.selectedOptionType;

  if (!optionType) {
    notFound();
  }

  const optionTypeInUse =
    optionType.productCount > 0 ||
    optionType.values.some((value) => value.variantCount > 0);
  const currentHref = `/dashboard/catalog/option-types/${optionTypeId}`;

  return (
    <AdminEditorPage
      backHref="/dashboard/catalog/option-types"
      backLabel="Back to option types"
      description="Edit reusable variant structure and manage the values attached to this option type from one focused editor."
      main={
        <>
          <AdminPanel>
            <AdminSectionHeader
              title="Option type record"
              description="Option types stay separate from products so multiple products can reuse the same structure."
            />
            <div className="mt-5">
              <OptionTypeForm
                optionType={optionType}
                returnTo={currentHref}
                submitLabel="Save option type"
              />
            </div>
          </AdminPanel>

          <AdminPanel>
            <AdminSectionHeader
              title="Option values"
              description="Manage the actual values variants can pick from under this option type."
            />

            <div className="mt-5 space-y-4">
              {optionType.values.length > 0 ? (
                <div className="space-y-3">
                  {optionType.values.map((value) => (
                    <form
                      key={value.id}
                      action={saveOptionValueAction}
                      className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-4"
                    >
                      <input name="optionTypeId" type="hidden" value={optionType.id} />
                      <input name="optionValueId" type="hidden" value={value.id} />
                      <input name="returnTo" type="hidden" value={currentHref} />
                      <div className="grid gap-3 md:grid-cols-2">
                        <AdminField
                          defaultValue={value.valueName}
                          label="Value name"
                          name="valueName"
                          placeholder="Large"
                        />
                        <AdminField
                          defaultValue={value.valueCode ?? ""}
                          label="Value code"
                          name="valueCode"
                          placeholder="L"
                        />
                        <AdminField
                          defaultValue={value.swatchHex ?? ""}
                          label="Swatch hex"
                          name="swatchHex"
                          placeholder="#111111"
                        />
                        <AdminField
                          defaultValue={value.sortOrder}
                          label="Sort order"
                          name="sortOrder"
                          type="number"
                        />
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        {value.variantCount > 0 ? (
                          <AdminBadge
                            label={`${value.variantCount.toLocaleString("en")} variants`}
                            tone="amber"
                          />
                        ) : (
                          <AdminBadge label="Unused" tone="emerald" />
                        )}
                        <AdminActionButton tone="sky">Save value</AdminActionButton>
                      </div>
                    </form>
                  ))}
                </div>
              ) : (
                <AdminEmptyState
                  title="No values yet"
                  body="Add values under this option type so variants can use them."
                />
              )}

              <form
                action={saveOptionValueAction}
                className="space-y-4 rounded-[1rem] border border-dashed border-stone-200 px-4 py-4"
              >
                <input name="optionTypeId" type="hidden" value={optionType.id} />
                <input name="returnTo" type="hidden" value={currentHref} />
                <div className="grid gap-3 md:grid-cols-2">
                  <AdminField label="Value name" name="valueName" placeholder="Medium" />
                  <AdminField label="Value code" name="valueCode" placeholder="M" />
                  <AdminField label="Swatch hex" name="swatchHex" placeholder="#f97316" />
                  <AdminField label="Sort order" name="sortOrder" type="number" />
                </div>
                <AdminActionButton>Add option value</AdminActionButton>
              </form>

              {optionType.values.some((value) => value.variantCount === 0) ? (
                <div className="space-y-3">
                  <AdminSectionHeader title="Remove unused values" />
                  <div className="flex flex-wrap gap-3">
                    {optionType.values
                      .filter((value) => value.variantCount === 0)
                      .map((value) => (
                        <form action={deleteOptionValueAction} key={value.id}>
                          <input name="optionValueId" type="hidden" value={value.id} />
                          <input name="returnTo" type="hidden" value={currentHref} />
                          <AdminActionButton tone="rose">
                            Remove {value.valueName}
                          </AdminActionButton>
                        </form>
                      ))}
                  </div>
                </div>
              ) : null}
            </div>
          </AdminPanel>
        </>
      }
      aside={
        <AdminPanel>
          <AdminSectionHeader
            title="Record actions"
            description="Option types linked to products or variants cannot be deleted."
          />
          <div className="mt-5 space-y-4">
            {optionTypeInUse ? (
              <AdminInlineHint tone="amber">
                This option type is already linked to products or variants, so it cannot be deleted yet.
              </AdminInlineHint>
            ) : (
              <form action={deleteOptionTypeAction}>
                <input name="optionTypeId" type="hidden" value={optionType.id} />
                <input name="returnTo" type="hidden" value="/dashboard/catalog/option-types" />
                <AdminActionButton tone="rose">Delete option type</AdminActionButton>
              </form>
            )}
          </div>
        </AdminPanel>
      }
      tabs={<CatalogTabs currentPath="/dashboard/catalog/option-types" />}
      title="Option Type"
    />
  );
}
