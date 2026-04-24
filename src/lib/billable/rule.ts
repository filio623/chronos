export interface BillableRuleInput {
  projectDefault?: boolean | null;
  clientDefault?: boolean | null;
  // CONTRACT: a new precedence factor (workspace default, etc.) added here
  // requires both wrappers (server + client) to populate it.
}

export function resolveDefaultBillableRule(input: BillableRuleInput): boolean {
  if (input.projectDefault != null) return input.projectDefault;
  if (input.clientDefault != null) return input.clientDefault;
  return true;
}
