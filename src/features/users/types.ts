export type UserSearchResult = {
  id: string;
  name: string | null;
  username: string | null;
  slug: string;
  image: string | null;
  bio: string | null;
  location: string | null;
  isFollowing: boolean;
  isSelf: boolean;
};

export type UserSearchResponse = {
  query: string;
  total: number;
  results: UserSearchResult[];
};

export type UserSearchErrorResponse = {
  error: string;
};
