// src/hooks/useConvexUser.ts
"use client";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useConvexUser() {
  const { user } = useUser();

  const convexUser = useQuery(
    user ? api.users.getUserByClerkId : ("skip" as never),
    user ? { clerkId: user.id } : "skip"
  );

  return {
    convexUser, // Convex doc (or null)
    clerkUser: user,
    isLoading: user && convexUser === undefined,
  };
}
