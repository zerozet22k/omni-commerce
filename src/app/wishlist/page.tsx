import Link from "next/link";

import { ProductCard } from "@/components/store/product-card";
import { StorefrontAccountShell } from "@/components/store/storefront-account-shell";
import { buttonClassName } from "@/components/ui/button";
import { storefrontCatalogService } from "@/modules/storefront/storefront-catalog.service";
import { requireStorefrontCustomer } from "@/modules/storefront/storefront-session";

export default async function WishlistPage() {
  const user = await requireStorefrontCustomer("/wishlist");
  const products = await storefrontCatalogService.listWishlistProducts(user.id);

  return (
    <StorefrontAccountShell
      currentPath="/wishlist"
      description="Keep the products you want to revisit in one place."
      title="Wishlist"
    >
      {products.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              initialInWishlist
              isAuthenticated
              loginHref="/login?next=%2Fwishlist"
              product={product}
            />
          ))}
        </div>
      ) : (
        <section className="rounded-[1.75rem] border border-dashed border-border bg-surface px-6 py-12 text-center shadow-[0_10px_30px_rgba(15,23,42,0.03)]">
          <h2 className="text-2xl font-bold text-text">Your wishlist is empty</h2>
          <p className="mt-3 text-sm leading-7 text-text-muted">
            Save products from the catalog and they will appear here.
          </p>
          <div className="mt-6">
            <Link className={buttonClassName({ variant: "primary" })} href="/shop">
              Browse products
            </Link>
          </div>
        </section>
      )}
    </StorefrontAccountShell>
  );
}
