import type { CommunityUser } from '$lib/community-types';

declare global {
  namespace App {
    interface Locals {
      /** The signed-in account, resolved from the `uc_session` cookie in `hooks.server.ts`. */
      user: CommunityUser | null;
    }
  }
}

export {};
