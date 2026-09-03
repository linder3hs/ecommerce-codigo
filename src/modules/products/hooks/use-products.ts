"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { productKeys } from "../constants";
import type { ProductQueryInput } from "../schemas/product.schema";
import { productService } from "../services/product.service";

export function useProducts(params: ProductQueryInput) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => productService.list(params),
    placeholderData: keepPreviousData,
  });
}
