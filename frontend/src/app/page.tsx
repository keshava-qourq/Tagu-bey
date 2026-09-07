"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    api
      .get<{ onboardingComplete: boolean }>("/api/auth/me")
      .then((profile) => {
        router.replace(profile.onboardingComplete ? "/dashboard" : "/onboarding");
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        router.replace("/login");
      });
  }, [router]);

  return null;
}
