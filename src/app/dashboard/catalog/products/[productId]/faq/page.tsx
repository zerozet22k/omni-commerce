import { notFound } from "next/navigation";

import {
  deleteProductFaqAction,
  saveProductFaqAction,
} from "@/app/dashboard/catalog/actions";
import { AdminActionNotice } from "@/components/admin/action-notice";
import { CatalogTabs, ProductTabs } from "@/components/admin/module-tabs";
import {
  AdminActionButton,
  AdminBadge,
  AdminEmptyState,
  AdminCheckbox,
  AdminField,
  AdminLinkButton,
  AdminPage,
  AdminPageHeader,
  AdminPanel,
  AdminSectionHeader,
} from "@/components/admin/workspace";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminSearchParams } from "@/modules/admin/admin-query";
import { adminProductService } from "@/modules/catalog/admin-product.service";

type ProductFaqPageProps = {
  params: Promise<{
    productId: string;
  }>;
  searchParams: Promise<AdminSearchParams>;
};

export default async function DashboardProductFaqPage({
  params,
  searchParams,
}: ProductFaqPageProps) {
  await requirePermission(PERMISSIONS.catalogView);
  const { productId } = await params;
  const resolvedSearchParams = await searchParams;
  const workspace = await adminProductService.getProductFaqWorkspace(productId);

  if (!workspace) {
    notFound();
  }

  const currentPath = `/dashboard/catalog/products/${productId}/faq`;

  return (
    <AdminPage>
      <AdminPageHeader
        title={`${workspace.product.productName} FAQ`}
        description="Manage customer-facing product questions and answers from a focused FAQ page."
        actions={
          <>
            <AdminLinkButton href={`/dashboard/catalog/products/${productId}`}>General</AdminLinkButton>
            <AdminLinkButton href="/dashboard/catalog/products" tone="primary">
              Back to products
            </AdminLinkButton>
          </>
        }
      />

      <CatalogTabs currentPath="/dashboard/catalog/products" />
      <ProductTabs currentPath={currentPath} productId={productId} />

      <AdminActionNotice searchParams={resolvedSearchParams} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_420px]">
        <AdminPanel>
          <AdminSectionHeader
            title="FAQ entries"
            description="Review existing questions and answers before adding new support guidance."
          />
          <div className="mt-4 space-y-3">
            {workspace.faqs.length > 0 ? (
              workspace.faqs.map((faq) => (
                <div
                  className="rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-4"
                  key={faq.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{faq.question}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <AdminBadge label={`SORT ${faq.sortOrder}`} tone="slate" />
                        <AdminBadge
                          label={faq.isActive ? "ACTIVE" : "INACTIVE"}
                          tone={faq.isActive ? "emerald" : "amber"}
                        />
                      </div>
                    </div>
                    <form action={deleteProductFaqAction}>
                      <input name="productId" type="hidden" value={productId} />
                      <input name="faqId" type="hidden" value={faq.id} />
                      <input name="returnTo" type="hidden" value={currentPath} />
                      <AdminActionButton tone="rose">Delete</AdminActionButton>
                    </form>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-700">{faq.answer}</p>
                  <form action={saveProductFaqAction} className="mt-4 space-y-4 rounded-[0.9rem] border border-stone-200 bg-white px-4 py-4">
                    <input name="productId" type="hidden" value={productId} />
                    <input name="faqId" type="hidden" value={faq.id} />
                    <input name="returnTo" type="hidden" value={currentPath} />
                    <AdminField
                      defaultValue={faq.question}
                      label="Edit question"
                      name="question"
                      placeholder="How should this product be cleaned?"
                    />
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-slate-700">Edit answer</span>
                      <textarea
                        className="block min-h-[140px] w-full rounded-[0.95rem] border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-950 outline-none"
                        defaultValue={faq.answer}
                        name="answer"
                        rows={5}
                      />
                    </label>
                    <AdminField
                      defaultValue={String(faq.sortOrder)}
                      label="Sort order"
                      name="sortOrder"
                      type="number"
                    />
                    <AdminCheckbox
                      defaultChecked={faq.isActive}
                      label="Active"
                      name="isActive"
                    />
                    <AdminActionButton>Edit FAQ item</AdminActionButton>
                  </form>
                </div>
              ))
            ) : (
              <AdminEmptyState
                title="No FAQ entries"
                body="Add the first FAQ item from the panel on the right."
              />
            )}
          </div>
        </AdminPanel>

        <AdminPanel>
          <AdminSectionHeader
            title="Add FAQ item"
            description="Create a new customer-facing Q&A entry for this product."
          />
          <form action={saveProductFaqAction} className="mt-4 space-y-4">
            <input name="productId" type="hidden" value={productId} />
            <input name="returnTo" type="hidden" value={currentPath} />
            <AdminField label="Question" name="question" placeholder="How should this product be cleaned?" />
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Answer</span>
              <textarea
                className="block min-h-[160px] w-full rounded-[0.95rem] border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-950 outline-none"
                name="answer"
                rows={6}
              />
            </label>
            <AdminField label="Sort order" name="sortOrder" type="number" />
            <AdminCheckbox defaultChecked label="Active" name="isActive" />
            <AdminActionButton tone="sky">Save FAQ item</AdminActionButton>
          </form>
        </AdminPanel>
      </div>
    </AdminPage>
  );
}
