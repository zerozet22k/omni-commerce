"use client";

import { useEffect, useState } from "react";
import Image, { type ImageProps } from "next/image";

type StorefrontImageProps = Omit<ImageProps, "src"> & {
  src: string;
  fallbackSrc: string;
};

export function StorefrontImage({
  src,
  fallbackSrc,
  alt,
  ...props
}: StorefrontImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const isUnoptimized = currentSrc.startsWith("/api/assets/");

  useEffect(() => {
    setCurrentSrc(src);
  }, [src]);

  return (
    <Image
      {...props}
      alt={alt}
      src={currentSrc}
      unoptimized={isUnoptimized}
      onError={() => {
        if (currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        }
      }}
    />
  );
}
