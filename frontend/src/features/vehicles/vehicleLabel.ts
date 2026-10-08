export function formatVehicleLabel(name: string, model: string): string {
  const cleanName = name.trim();
  const cleanModel = model.trim();
  if (!cleanName) return cleanModel;
  const normalizedName = cleanName.toLocaleLowerCase();
  const normalizedModel = cleanModel.toLocaleLowerCase();
  if (!normalizedModel || normalizedName === normalizedModel || normalizedName.endsWith(` ${normalizedModel}`)) return cleanName;
  return `${cleanName} ${cleanModel}`;
}
