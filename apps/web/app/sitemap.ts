import type { MetadataRoute } from "next";

const cities = ["bogota", "medellin", "cali"];
const services = ["limpieza-hogar", "jardineria", "limpieza-oficinas"];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const localLandings = cities.flatMap((city) =>
    services.map((service) => ({
      url: `${baseUrl}/${city}/${service}`,
      changeFrequency: "weekly" as const,
      priority: 0.7
    }))
  );

  return [
    { url: `${baseUrl}/`, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/faq`, changeFrequency: "weekly", priority: 0.5 },
    ...localLandings
  ];
}
