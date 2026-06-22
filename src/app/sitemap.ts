import type { MetadataRoute } from "next";

import { LABS } from "@/core/labs";

const BASE = "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: `${BASE}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE}/settings/models`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    },
    ...LABS.flatMap((lab) => [
      {
        url: `${BASE}${lab.href}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.9,
      },
      ...lab.subPages
        .filter((s) => s.status !== "planned")
        .map((s) => ({
          url: `${BASE}${s.href}`,
          lastModified: now,
          changeFrequency: "weekly" as const,
          priority: 0.7,
        })),
    ]),
  ];
}
