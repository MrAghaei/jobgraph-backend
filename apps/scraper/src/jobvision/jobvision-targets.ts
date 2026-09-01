export const JOBVISION_TARGETS = [
  { urlTitle: "developer", categoryKey: "programming" },
  { urlTitle: "software-qa", categoryKey: "programming" },
  { urlTitle: "data-science", categoryKey: "data" },
  { urlTitle: "network", categoryKey: "devops" },
  { urlTitle: "ui-ux", categoryKey: "design" },
  { urlTitle: "product-manager", categoryKey: "product" },
] as const;

export function jobvisionUrlTitle(categoryKey: string): string {
  const direct = JOBVISION_TARGETS.find((t) => t.urlTitle === categoryKey);
  if (direct) return direct.urlTitle;
  const byKey = JOBVISION_TARGETS.find((t) => t.categoryKey === categoryKey);
  return byKey?.urlTitle ?? "developer";
}

export function storedCategoryForJobvision(categoryKey: string): string {
  const direct = JOBVISION_TARGETS.find((t) => t.urlTitle === categoryKey);
  if (direct) return direct.categoryKey;
  const byKey = JOBVISION_TARGETS.find((t) => t.categoryKey === categoryKey);
  return byKey?.categoryKey ?? "programming";
}
