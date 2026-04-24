export interface ActiveBlockRef {
  id: string;
  clientId: string;
  /** 0 = client-level; >0 = project-scoped. Returned alongside the block so
   *  step 4 never requires a second round trip. */
  projectAssignmentCount: number;
}

export interface LinkagePort {
  /** Step 1a. */
  getProjectClientId(projectId: string): Promise<string | null>;

  /** Step 1b. Find any ACTIVE block linked to this project via InvoiceBlockProject,
   *  regardless of which client owns the block. (A project with no clientId can
   *  still be assigned to a block.) */
  findActiveBlockForProject(projectId: string): Promise<ActiveBlockRef | null>;

  /** Steps 3 + 4 data (block + assignment count in one read). */
  findLatestActiveClientBlock(clientId: string): Promise<ActiveBlockRef | null>;
}
