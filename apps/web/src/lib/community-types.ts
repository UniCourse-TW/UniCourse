// Community payload types, straight from the generated OpenAPI schema (never hand edited).
// `@unicourse/api-client` only re-exports the catalog types, so the schema is imported by path.
import type { components } from '../../../../packages/api-client/src/schema';

type Schemas = components['schemas'];

export type CommunityUser = Schemas['Me'];
export type PostType = Schemas['PostType'];
export type PostSummary = Schemas['PostSummary'];
export type PostDetail = Schemas['PostDetail'];
export type PostReply = Schemas['Reply'];
export type Author = Schemas['Author'];
export type Rating = Schemas['Rating'];
export type RatingStats = Schemas['RatingStats'];
export type MyRating = Schemas['MyRating'];
export type UserRating = Schemas['UserRating'];
export type School = Schemas['School'];
