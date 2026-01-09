export const avatarOptions = [
  "felix",
  "luna",
  "max",
  "sophie",
  "charlie",
  "alex",
  "bailey",
  "river",
  "sage",
  "phoenix",
  "quinn",
  "rowan",
];

export const generateRandomSeed = () => Math.random().toString(36).substring(7);

export const getAvatarUrl = (seed: string) =>
  `https://api.dicebear.com/7.x/lorelei-neutral/svg?seed=${seed}`;
