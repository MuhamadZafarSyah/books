/**
 * View-models untuk fitur Reading Events.
 *
 * Semua field berupa primitif atau ISO string supaya aman dilewatkan
 * dari Server Component ke Client Component (tidak ada `Date`,
 * tidak ada objek Prisma yang bocor).
 */

export type ReadingEventStatus =
  | "SCHEDULED"
  | "FULL"
  | "ONGOING"
  | "COMPLETED"
  | "CANCELLED";

export type ReadingEventParticipantSummary = {
  id: string;
  userId: string;
  name: string | null;
  image: string | null;
  joinedAt: string;
  comment: string | null;
};

export type ReadingEventSummary = {
  id: string;
  hostId: string;
  hostName: string | null;
  hostImage: string | null;
  title: string;
  locationAddress: string;
  startsAt: string;
  endsAt: string;
  quota: number;
  participantCount: number;
  status: ReadingEventStatus;
};

export type ReadingEventDetail = ReadingEventSummary & {
  description: string | null;
  latitude: number;
  longitude: number;
  bookReferenceUrl: string | null;
  participants: ReadingEventParticipantSummary[];
  isHost: boolean;
  isParticipant: boolean;
};

export type EventListPageData = {
  events: ReadingEventSummary[];
  page: number;
  pageSize: number;
  totalCount: number;
  hasNext: boolean;
};
