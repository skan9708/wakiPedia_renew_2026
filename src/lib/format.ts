export const formatDate = (iso: string) => new Date(iso).toLocaleDateString();
export const formatNumber = (n: number, digits = 1) => n.toFixed(digits);


