export function mapToCamelCase(row: any) {
  const mapped = {};
  for (const key of Object.keys(row)) {
    const camelKey = key
      .toLowerCase()
      .replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    mapped[camelKey] = row[key];
  }
  return mapped;
}
