"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { customerKeys } from "../constants";
import { userService } from "../services/user.service";

import type { UserQueryInput } from "../schemas/user.schema";

export function useUsers(params: UserQueryInput) {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: () => userService.list(params),
    placeholderData: keepPreviousData,
  });
}
