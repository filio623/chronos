export function resolveCreateClientColor(input: {
  submitted?: string | null;
  nextAuto: string;
}): string {
  const submitted = input.submitted?.trim();
  return submitted ? submitted : input.nextAuto;
}
