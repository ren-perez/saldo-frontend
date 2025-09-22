// src/components/InitUser.tsx
"use client";

import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";

export default function InitUser() {
    const { user } = useUser();
    const initUser = useMutation(api.users.initUser);

    useEffect(() => {
        if (user) {
            initUser({
                clerkId: user.id,
                email: user.primaryEmailAddress?.emailAddress ?? "",
            });
        }
    }, [user, initUser]);

    return null;
}
