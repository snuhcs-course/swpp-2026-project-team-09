/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// Answers of the main server that differ from a valid one in one place, each named for its difference, for the tests
// of the app's checks of those answers.

export type Variant = [string, unknown];

type Shape = Record<string, unknown>;

export function omit(value: Shape, name: string): Shape {
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== name));
}

// Each named field left out, null, or set to each of the values given. Null is not tried for the fields in `nullable`,
// which may hold it.
export function wrongFields(
  valid: Shape,
  wrong: Record<string, readonly unknown[]>,
  nullable: readonly string[] = [],
): Variant[] {
  const variants: Variant[] = [];
  for (const [name, values] of Object.entries(wrong)) {
    variants.push([`no ${name}`, omit(valid, name)]);
    for (const value of nullable.includes(name) ? values : [null, ...values]) {
      variants.push([`${name} ${JSON.stringify(value)}`, { ...valid, [name]: value }]);
    }
  }
  return variants;
}

// The variants of one field's value, put in the whole answer.
export function inside(whole: Shape, name: string, variants: readonly Variant[]): Variant[] {
  return variants.map(([label, part]): Variant => [`${name}: ${label}`, { ...whole, [name]: part }]);
}

// The variants of an item, each as the one wrong item of a list after a valid one.
export function inList(valid: unknown, variants: readonly Variant[]): Variant[] {
  return variants.map(([label, item]): Variant => [`an item with ${label}`, [valid, item]]);
}
