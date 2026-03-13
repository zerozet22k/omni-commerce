"use client";

import Link from "next/link";
import { startTransition, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { buttonClassName } from "@/components/ui/button";

export function ProductReviewForm({
  canSubmit,
  initialMessage,
  isAuthenticated,
  loginHref,
  productId,
}: {
  productId: string;
  isAuthenticated: boolean;
  loginHref: string;
  canSubmit: boolean;
  initialMessage: string | null;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState<string | null>(initialMessage);
  const [isPending, setIsPending] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className="rounded-[1.4rem] border border-border bg-surface-alt p-4 text-sm text-text-muted">
        <p>Sign in with your customer account to leave a review.</p>
        <div className="mt-3">
          <Link className={buttonClassName({ size: "sm", variant: "secondary" })} href={loginHref}>
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (!canSubmit) {
    return (
      <div className="rounded-[1.4rem] border border-border bg-surface-alt p-4 text-sm text-text-muted">
        {initialMessage ?? "Review submission is not available for this product."}
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("productId", productId);
    formData.set("rating", String(rating));
    setIsPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/store/reviews", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to submit review.");
      }

      setMessage(payload.message ?? "Review submitted.");
      formRef.current?.reset();
      setRating(5);
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit review.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} ref={formRef}>
      <input name="productId" type="hidden" value={productId} />

      <div className="space-y-2">
        <p className="text-sm font-semibold text-text">Rating</p>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((value) => {
            const isSelected = rating === value;

            return (
              <button
                key={value}
                className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition ${
                  isSelected
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-surface text-text-muted hover:bg-surface-alt hover:text-text"
                }`}
                onClick={() => setRating(value)}
                type="button"
              >
                {value}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-semibold text-text" htmlFor="review-title">
          Title
        </label>
        <input
          className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-text outline-none focus:border-primary/20 focus:ring-2 focus:ring-focus-ring/15"
          id="review-title"
          maxLength={120}
          name="title"
          placeholder="Summarize your experience"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-semibold text-text" htmlFor="review-comment">
          Review
        </label>
        <textarea
          className="min-h-28 rounded-xl border border-border bg-surface px-3 py-3 text-sm text-text outline-none focus:border-primary/20 focus:ring-2 focus:ring-focus-ring/15"
          id="review-comment"
          name="comment"
          placeholder="Share practical details about the product"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-semibold text-text" htmlFor="review-media">
          Attach images
        </label>
        <input
          accept="image/*"
          className="block w-full rounded-xl border border-border bg-surface px-3 py-3 text-sm text-text"
          id="review-media"
          multiple
          name="media"
          type="file"
        />
        <p className="text-xs text-text-muted">Up to 4 image files.</p>
      </div>

      {message ? (
        <p className="rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm text-text-muted">
          {message}
        </p>
      ) : null}

      <button
        className={buttonClassName({ variant: "primary" })}
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Submitting..." : "Submit review"}
      </button>
    </form>
  );
}
