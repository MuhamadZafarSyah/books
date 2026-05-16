import type {
  Prisma,
  ReadingCircle,
  ReadingCircleComment,
  ReadingCircleMember,
  ReadingCirclePost,
} from "@prisma/client";

import type {
  ReadingCircleBookContext,
  ReadingCircleCommentSummary,
  ReadingCircleDetail,
  ReadingCircleMemberSummary,
  ReadingCirclePostSummary,
  ReadingCircleSummary,
} from "@/features/reading-circle/types";

type PublicUserShape = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

function readContextSnapshot(
  raw: Prisma.JsonValue | null | undefined,
  fallbackTitle: string,
  fallbackAuthor: string,
): ReadingCircleBookContext {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const candidate = raw as Record<string, unknown>;
    return {
      id: typeof candidate.id === "string" ? candidate.id : "",
      workKey:
        typeof candidate.workKey === "string" ? candidate.workKey : null,
      editionKey:
        typeof candidate.editionKey === "string" ? candidate.editionKey : null,
      title:
        typeof candidate.title === "string" && candidate.title.length > 0
          ? candidate.title
          : fallbackTitle,
      subtitle:
        typeof candidate.subtitle === "string" ? candidate.subtitle : null,
      authorText:
        typeof candidate.authorText === "string" &&
        candidate.authorText.length > 0
          ? candidate.authorText
          : fallbackAuthor,
      authors: Array.isArray(candidate.authors)
        ? candidate.authors.filter(
            (value): value is string => typeof value === "string",
          )
        : [],
      coverUrl:
        typeof candidate.coverUrl === "string" ? candidate.coverUrl : null,
      firstPublishYear:
        typeof candidate.firstPublishYear === "number"
          ? candidate.firstPublishYear
          : null,
      publishDate:
        typeof candidate.publishDate === "string" ? candidate.publishDate : null,
      languages: Array.isArray(candidate.languages)
        ? candidate.languages.filter(
            (value): value is string => typeof value === "string",
          )
        : [],
      publishers: Array.isArray(candidate.publishers)
        ? candidate.publishers.filter(
            (value): value is string => typeof value === "string",
          )
        : [],
      subjects: Array.isArray(candidate.subjects)
        ? candidate.subjects.filter(
            (value): value is string => typeof value === "string",
          )
        : [],
      pageCount:
        typeof candidate.pageCount === "number" ? candidate.pageCount : null,
      description:
        typeof candidate.description === "string"
          ? candidate.description
          : null,
      openLibraryUrl:
        typeof candidate.openLibraryUrl === "string"
          ? candidate.openLibraryUrl
          : null,
    };
  }

  return {
    id: "",
    workKey: null,
    editionKey: null,
    title: fallbackTitle,
    subtitle: null,
    authorText: fallbackAuthor,
    authors: [],
    coverUrl: null,
    firstPublishYear: null,
    publishDate: null,
    languages: [],
    publishers: [],
    subjects: [],
    pageCount: null,
    description: null,
    openLibraryUrl: null,
  };
}

export function serializeMember(
  member: ReadingCircleMember & { user: PublicUserShape },
): ReadingCircleMemberSummary {
  return {
    id: member.id,
    userId: member.userId,
    role: member.role,
    name: member.user.name,
    email: member.user.email,
    image: member.user.image,
    joinedAt: member.joinedAt.toISOString(),
  };
}

export function serializeComment(
  comment: ReadingCircleComment & { author: PublicUserShape },
): ReadingCircleCommentSummary {
  return {
    id: comment.id,
    authorId: comment.authorId,
    authorName: comment.author.name,
    authorImage: comment.author.image,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
  };
}

export function serializePost(
  post: ReadingCirclePost & {
    author: PublicUserShape;
    comments: Array<ReadingCircleComment & { author: PublicUserShape }>;
  },
): ReadingCirclePostSummary {
  return {
    id: post.id,
    authorId: post.authorId,
    authorName: post.author.name,
    authorImage: post.author.image,
    type: post.type,
    title: post.title ?? null,
    body: post.body,
    spoilerLevel: post.spoilerLevel,
    spoilerFromChapter: post.spoilerFromChapter ?? null,
    spoilerToChapter: post.spoilerToChapter ?? null,
    commentCount: post.commentCount,
    createdAt: post.createdAt.toISOString(),
    comments: post.comments.map(serializeComment),
  };
}

export function serializeCircleSummary(
  circle: Pick<
    ReadingCircle,
    | "id"
    | "title"
    | "description"
    | "privacy"
    | "bookTitle"
    | "bookAuthor"
    | "bookCoverUrl"
    | "memberCount"
    | "lastActivityAt"
    | "updatedAt"
    | "ownerId"
  >,
  myRole: ReadingCircleSummary["myRole"] = null,
): ReadingCircleSummary {
  return {
    id: circle.id,
    title: circle.title,
    description: circle.description ?? null,
    privacy: circle.privacy,
    bookTitle: circle.bookTitle,
    bookAuthor: circle.bookAuthor,
    bookCoverUrl: circle.bookCoverUrl ?? null,
    memberCount: circle.memberCount,
    lastActivityAt: circle.lastActivityAt?.toISOString() ?? null,
    updatedAt: circle.updatedAt.toISOString(),
    ownerId: circle.ownerId,
    myRole,
  };
}

export type SerializeDetailInput = {
  circle: ReadingCircle;
  posts: Array<
    ReadingCirclePost & {
      author: PublicUserShape;
      comments: Array<ReadingCircleComment & { author: PublicUserShape }>;
    }
  >;
  members: Array<ReadingCircleMember & { user: PublicUserShape }>;
  myRole: ReadingCircleSummary["myRole"];
  canView: boolean;
};

export function serializeCircleDetail(
  input: SerializeDetailInput,
): ReadingCircleDetail {
  const summary = serializeCircleSummary(input.circle, input.myRole);

  return {
    ...summary,
    context: readContextSnapshot(
      input.circle.contextJson,
      input.circle.bookTitle,
      input.circle.bookAuthor,
    ),
    openLibraryUrl: input.circle.openLibraryUrl ?? null,
    targetLabel: input.circle.targetLabel ?? null,
    targetChapterFrom: input.circle.targetChapterFrom ?? null,
    targetChapterTo: input.circle.targetChapterTo ?? null,
    currentChapterFocus: input.circle.currentChapterFocus ?? null,
    posts: input.canView ? input.posts.map(serializePost) : [],
    members: input.members.map((member) => serializeMember(member)),
    myRole: input.myRole,
    canView: input.canView,
  };
}
