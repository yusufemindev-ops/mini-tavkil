// User audiences (Better Auth `userType`). The admin app only admits ADMIN.
// Mirrors backend `src/common/constants/auth.constants.ts`.
export const USER_TYPE = {
  ADMIN: 'admin',
  BUYER: 'buyer',
} as const;
