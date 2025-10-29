import { createUser, findUserByName, touchUser } from "./user.repository.js";
import type { UserRecord } from "./user.types.js";

export const signInWithName = async (
  rawName: string,
): Promise<{ user: UserRecord; isNew: boolean }> => {
  const name = rawName.trim();

  const existingUser = await findUserByName(name);
  if (existingUser) {
    const updatedUser = await touchUser(existingUser);
    return { user: updatedUser, isNew: false };
  }

  const newUser = await createUser(name);
  return { user: newUser, isNew: true };
};
