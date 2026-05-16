/**
 * Stable view-models for Reading Circle UI. All shapes are decoupled from
 * Prisma models so client components never depend on internal columns.
 */

export type ReadingCirclePrivacy = "PUBLIC" | "PRIVATE" | "UNLISTED";
export type ReadingCircleRole = "OWNER" | "MODERATOR" | "MEMBER";
export type ReadingCirclePostType =
  | "DISCUSSION"
  | "CHECKPOINT"
  | "QUESTION"
  | "ANNOUNCEMENT"
  | "SYSTEM";
export type ReadingCircleSpoilerLevel =
  | "NONE"
  | "CHAPTER_RANGE"
  | "MAJOR"
  | "ENDING";

export type ReadingCircleBookContext = {
  id: string;
  workKey: string | null;
  editionKey: string | null;
  title: string;
  subtitle: string | null;
  authorText: string;
  authors: string[];
  coverUrl: string | null;
  firstPublishYear: number | null;
  publishDate: string | null;
  languages: string[];
  publishers: string[];
  subjects: string[];
  pageCount: number | null;
  description: string | null;
  openLibraryUrl: string | null;
};

export type ReadingCircleSummary = {
  id: string;
  title: string;
  description: string | null;
  privacy: ReadingCirclePrivacy;
  bookTitle: string;
  bookAuthor: string;
  bookCoverUrl: string | null;
  memberCount: number;
  lastActivityAt: string | null;
  updatedAt: string;
  ownerId: string;
  /** Membership of the requesting user, or null if not a member. */
  myRole: ReadingCircleRole | null;
};

export type ReadingCircleMemberSummary = {
  id: string;
  userId: string;
  role: ReadingCircleRole;
  name: string | null;
  email: string | null;
  image: string | null;
  joinedAt: string;
};

export type ReadingCircleCommentSummary = {
  id: string;
  authorId: string;
  authorName: string | null;
  authorImage: string | null;
  body: string;
  createdAt: string;
};

export type ReadingCirclePostSummary = {
  id: string;
  authorId: string;
  authorName: string | null;
  authorImage: string | null;
  type: ReadingCirclePostType;
  title: string | null;
  body: string;
  spoilerLevel: ReadingCircleSpoilerLevel;
  spoilerFromChapter: number | null;
  spoilerToChapter: number | null;
  commentCount: number;
  createdAt: string;
  comments: ReadingCircleCommentSummary[];
};

export type ReadingCircleDetail = ReadingCircleSummary & {
  context: ReadingCircleBookContext;
  openLibraryUrl: string | null;
  targetLabel: string | null;
  targetChapterFrom: number | null;
  targetChapterTo: number | null;
  currentChapterFocus: string | null;
  posts: ReadingCirclePostSummary[];
  members: ReadingCircleMemberSummary[];
  myRole: ReadingCircleRole | null;
  /** Whether the requesting user can view post bodies / comments. */
  canView: boolean;
};

export type ReadingCircleBootstrap = {
  circle: ReadingCircleDetail | null;
  history: ReadingCircleSummary[];
};

export type ReadingCirclePageData = {
  circle: ReadingCircleDetail;
  history: ReadingCircleSummary[];
};
