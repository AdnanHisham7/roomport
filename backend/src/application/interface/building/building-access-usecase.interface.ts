export interface IBuildingAccessUseCase {
  /**
   * Throws ForbiddenError if the given user (by role) does not own or manage
   * the given building. super_admin always passes. A falsy buildingId is
   * treated as "no scoping required" and also passes.
   */
  assertOwnership(
    buildingId: string | undefined,
    userId: string,
    role: string,
  ): Promise<void>;

  /**
   * Returns the deduplicated list of building ids the given user owns or
   * manages. Callers are expected to only invoke this for non-super_admin
   * users, since super_admin has no implicit building scope.
   */
  getAccessibleBuildingIds(userId: string): Promise<string[]>;
}
