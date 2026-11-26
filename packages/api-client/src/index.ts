import createClient from 'openapi-fetch';
import type { components, paths } from './schema';

type Schemas = components['schemas'];

export type Offering = Schemas['Offering'];
export type Meeting = Schemas['Meeting'];
export type Requirement = Schemas['Requirement'];
export type ExtraValue = Schemas['ExtraValue'];
export type School = Schemas['School'];
export type CourseHistory = Schemas['CourseHistory'];
export type CourseTerm = Schemas['CourseTerm'];
export type CourseTotals = Schemas['CourseTotals'];
export type CourseRanking = Schemas['CourseRanking'];
export type TermTrend = Schemas['TermTrend'];
export type EnrollmentPoint = Schemas['EnrollmentPoint'];
export type SearchPage = Schemas['SearchPage'];
export type SearchSort = Schemas['SearchSort'];
export type Institution = Schemas['Institution'];
export type Institutions = Schemas['Institutions'];
export type InstitutionKind = Schemas['InstitutionKind'];
export type CrawlStatus = Schemas['CrawlStatus'];
export type EducationSystem = Schemas['EducationSystem'];
export type Ownership = Schemas['Ownership'];

export type ErrorBody = Schemas['ErrorBody'];
export type ErrorCode = Schemas['ErrorCode'];
export type Me = Schemas['Me'];
export type LoginRequest = Schemas['LoginRequest'];
export type RegisterRequest = Schemas['RegisterRequest'];
export type ProfileUpdate = Schemas['ProfileUpdate'];
export type PublicProfile = Schemas['PublicProfile'];
export type Author = Schemas['Author'];
export type PostType = Schemas['PostType'];
export type TopLevelPostType = Schemas['TopLevelPostType'];
export type PostSummary = Schemas['PostSummary'];
export type PostDetail = Schemas['PostDetail'];
export type PostPage = Schemas['PostPage'];
export type Reply = Schemas['Reply'];
export type NewPost = Schemas['NewPost'];
export type NewReply = Schemas['NewReply'];
export type PostUpdate = Schemas['PostUpdate'];
export type VoteInput = Schemas['VoteInput'];
export type VoteResult = Schemas['VoteResult'];
export type Rating = Schemas['Rating'];
export type RatingInput = Schemas['RatingInput'];
export type RatingStats = Schemas['RatingStats'];
export type MyRating = Schemas['MyRating'];
export type UserRating = Schemas['UserRating'];

export function catalogClient(baseUrl: string, fetch: typeof globalThis.fetch) {
  return createClient<paths>({ baseUrl, fetch });
}
