# Blind Reading Match — Implementation Plan

## Goal

Build a gamified discovery feature where users become interested in other readers through book taste, reading prompts, and staged anonymous clues before any identity reveal.

Core loop:

1. User opts in and chooses reading-match intent.
2. System generates daily anonymous candidates from reading interests.
3. User opens 3 staged `Secret Chapter` clues.
4. User sends `Bookmark Interest`.
5. If the reverse candidate is also interested, both profiles are revealed.
6. User can follow/profile-view/start chat after mutual reveal.

## MVP Scope

- Opt-in / pause profile.
- Eligibility check from shelf/review/quote activity.
- Daily candidate generation with matching score.
- Anonymous Secret Chapter card.
- Reveal next clue.
- Skip.
- Bookmark Interest.
- Mutual reveal if both users bookmark each other.
- Start existing direct chat after mutual.
- Privacy-safe clues only from public-facing data.

## Privacy Rules

- Before mutual: no name, username, avatar, email, profile URL, exact location.
- Use only aggregated/book-interest clues.
- Do not expose private shelf, private quotes, or private reviews as target clues.
- One-sided interest never notifies the target.
- Chat is unavailable before mutual.

## Candidate Matching Signals

Scoring v1:

- Shared public books.
- Same authors.
- Preferred genres / manually chosen interest tags.
- Public review and quote themes by keyword.
- Same reading circles.
- Same reading events.
- Profile completeness and recent activity.

Hard exclusions:

- self,
- non-active blind profile,
- already skipped recently,
- already mutual/revealed,
- currently active pending candidate,
- no visible clue data.

## Data Model

- `BlindMatchProfile` stores opt-in preferences.
- `BlindMatchCandidate` stores viewer-target pair, score, clue snapshots, interest/reveal status, and expiry.

Candidate rows are directional: A→B and B→A can exist independently. Mutual is detected transactionally when both sides mark interest.

## UX States

- Not opted in.
- Not eligible.
- No candidates today.
- Candidate available.
- Pending interest.
- Mutual reveal.
- Paused.
- Error.

## Acceptance Criteria

- No candidate identity leak before mutual.
- User can open up to 3 clues.
- Interest requires at least 2 clue stages.
- Skip hides candidate.
- Mutual unlocks profile and chat CTA.
- Server actions are auth-gated and ownership-checked.
- `npm run lint` and `npm run build` pass.
