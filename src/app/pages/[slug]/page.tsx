import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StorefrontBreadcrumbs } from "@/components/store/storefront-breadcrumbs";
import { StorefrontShell } from "@/components/store/storefront-shell";
import { storefrontCatalogService } from "@/modules/storefront/storefront-catalog.service";

type PublishedPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: PublishedPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await storefrontCatalogService.getPublishedPageBySlug(slug);

  if (!page) {
    return {};
  }

  return {
    title: page.seoTitle ?? page.title,
    description: page.seoDescription ?? page.content ?? undefined,
  };
}

export default async function PublishedPage({ params }: PublishedPageProps) {
  const { slug } = await params;
  const page = await storefrontCatalogService.getPublishedPageBySlug(slug);

  if (!page) {
    notFound();
  }

  return (
    <StorefrontShell>
      <StorefrontBreadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: page.title },
        ]}
      />

      <article className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.04)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Published page
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          {page.title}
        </h1>
        {page.content ? (
          <div className="mt-6 whitespace-pre-line text-sm leading-8 text-slate-700">
            {page.content}
          </div>
        ) : (
          <p className="mt-6 text-sm text-slate-500">No public content published yet.</p>
        )}
      </article>
    </StorefrontShell>
  );
}
