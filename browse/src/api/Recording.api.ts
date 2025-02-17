import CacophonyApi from "./CacophonyApi";
import * as querystring from "querystring";
import { DeviceVisitMap } from "./visits";
import * as moment from "moment";
import { shouldViewAsSuperUser } from "@/utils";
import {
  DeviceId,
  RecordingId,
  TagId,
  TrackId,
  TrackTagId,
} from "@typedefs/api/common";
import { ApiRecordingResponse } from "@typedefs/api/recording";
import {
  ApiAutomaticTrackTagResponse,
  ApiHumanTrackTagResponse,
  ApiTrackTagRequest,
} from "@typedefs/api/trackTag";
import { ApiRecordingTagRequest } from "@typedefs/api/tag";
import { ApiTrackResponse } from "@typedefs/api/track";

// eslint-disable-next-line @typescript-eslint/no-unused-vars,no-unused-vars
export type JwtToken<T> = string;
type UtcTimestamp = string;

export interface ErrorResult {
  messages: string[];
  errors?: string[];
  errorType?: string;
}

interface SuccessFetchResult<SUCCESS> {
  result: SUCCESS;
  success: true;
  status: number;
}

interface FailureFetchResult<FAILURE = ErrorResult> {
  result: FAILURE;
  success: false;
  status: number;
}

export type FetchResult<T> = SuccessFetchResult<T> | FailureFetchResult;

export interface Location {
  type: "Point" | string;
  coordinates: [number, number];
}

export interface LimitedTrack {
  trackId: TrackId;
  data: {
    start_s: number;
    end_s: number;
    positions: [Seconds, Rectangle][];
    num_frames: number;
  };
  tags: string[];
  needsTagging: boolean;
}

export interface TagLimitedRecording {
  RecordingId: RecordingId;
  DeviceId: DeviceId;
  tracks: LimitedTrack[];
  recordingJWT: JwtToken<Mp4File>;
  tagJWT: JwtToken<TrackTag>;
}

type Mp4File = "string";
type CptvFile = "string";
export interface Recording {
  messages: [];
  recording: ApiRecordingResponse;
  rawSize?: number; // CPTV size
  fileSize?: number; // MP4 size
  downloadFileJWT?: JwtToken<Mp4File>;
  downloadRawJWT?: JwtToken<CptvFile>;
  success: boolean;
}

type Seconds = number;
type Rectangle = [number, number, number, number];

export interface Track {
  id: TrackId;
  data: {
    positions: [Seconds, Rectangle][];
    start_s: Seconds;
    end_s: Seconds;
    tag: string;
    label: string;
    clarity: number;
    confidence: number;
    num_frames: number;
    max_novelty: number;
    average_novelty: number;
    all_class_confidences: Record<string, number>;
  };
  createdAt: UtcTimestamp;
  updatedAt: UtcTimestamp;
  archivedAt: UtcTimestamp | null;
  AlgorithmId: number;
  TrackTags: TrackTag[];
}

export interface User {
  username: string;
  id?: number;
  email: string;
  globalPermission: "read" | "write" | "off";
}

export type TrackTag = ApiAutomaticTrackTagResponse | ApiHumanTrackTagResponse;

export interface LimitedTrackTag {
  TrackTagId: TrackTagId;
  what: string;
}

export interface Tag {
  confidence: number;
  animal: null | string;
  automatic: boolean;
  createdAt: string;
  detail: string;
  event: string;
  duration: null | number;
  id: number;
  startTime: null | string;
  tagger: { username: string; id: number };
  taggerId: number;
  version: number;
  what: null | string;
}

export interface QueryResultCount {
  count: number;
  success: boolean;
  messages: string[];
}

export interface QueryResult<T> extends QueryResultCount {
  statusCode: number;
  limit: string; // NOTE(jon): Actually, a number, but comes back as a string...
  offset: string; // NOTE(jon): Actually, a number, but comes back as a string...
  rows: T[];
}

export interface VisitsQueryResult extends QueryResult<DeviceVisitMap> {
  hasMoreVisits: boolean;
  totalRecordings: number;
  numVisits: number;
  queryOffset: number;
  numRecordings: number;
}

// TODO: Unify this with the TagMode type in the API, extract both into a third Types/Interfaces repo.
export type TagMode =
  | "any"
  | "no-human"
  | "tagged"
  | "human-tagged"
  | "automatic-tagged"
  | "both-tagged"
  | "untagged";

export interface RecordingQuery {
  tagMode?: TagMode;
  minS?: string;
  maxS?: string;
  tag?: string[] | string;
  limit?: number;
  offset?: number;
  page?: number;
  perPage?: number;
  days?: number | "all";
  deleted?: boolean;
  from?: string;
  to?: string;
  group?: number[];
  device?: number[];
  station?: number[];
  type?: string;
  order?: any; // TODO - It's not clear what order accepts (it's a sequelize thing), but nobody seems to use it right now.
}

const apiPath = "/api/v1/recordings";

function query(
  queryParams: RecordingQuery
): Promise<FetchResult<QueryResult<ApiRecordingResponse>>> {
  return CacophonyApi.get(
    `${apiPath}?${querystring.stringify(makeApiQuery(queryParams))}`
  );
}

function addIfSet(map: any, value: string | number, submap: string, key = "") {
  if (value && typeof value === "string" && value.trim() !== "") {
    map[submap] = map[submap] || {};
    if (Number(value).toString() == value) {
      map[submap][key] = Number(value);
    } else {
      map[submap][key] = value;
    }
  } else if (typeof value === "number") {
    map[submap] = map[submap] || {};
    map[submap][key] = value;
  }
}

function makeApiQuery(query: RecordingQuery): any {
  const apiWhere = {};
  addIfSet(apiWhere, query.minS || "0", "duration", "$gte");
  addIfSet(apiWhere, query.maxS, "duration", "$lte");

  // Map between the mismatch in video type types between frontend and backend
  if (query.type === "video") {
    apiWhere["type"] = "thermalRaw";
  } else if (query.type && query.type !== "both") {
    apiWhere["type"] = query.type;
  }

  // Remove the group param, since the API doesn't handle that, we're just using
  // it to accurately share search parameters via urls.
  const hasDevices = query.hasOwnProperty("device") && query.device.length > 0;
  const hasGroups = query.hasOwnProperty("group") && query.group.length > 0;
  const hasStations =
    query.hasOwnProperty("station") && query.station.length > 0;
  if (
    (hasDevices && hasGroups) ||
    (hasDevices && hasStations) ||
    (hasGroups && hasStations)
  ) {
    apiWhere["$or"] = [];
    if (hasDevices) {
      apiWhere["$or"].push({ DeviceId: query.device });
    }
    if (hasGroups) {
      apiWhere["$or"].push({ GroupId: query.group });
    }
    if (hasStations) {
      apiWhere["$or"].push({ StationId: query.station });
    }
  } else if (hasGroups) {
    apiWhere["GroupId"] = query.group;
  } else if (hasDevices) {
    apiWhere["DeviceId"] = query.device;
  } else if (hasStations) {
    apiWhere["StationId"] = query.station;
  }

  addIfSet(apiWhere, calculateFromTime(query), "recordingDateTime", "$gt");
  addIfSet(apiWhere, query.to, "recordingDateTime", "$lt");
  const apiParams = {};
  const whereString = JSON.stringify(apiWhere);
  if (whereString.length > 2) {
    apiParams["where"] = whereString;
  }
  if (query.limit) {
    apiParams["limit"] = query.limit;
  }
  if (query.offset) {
    apiParams["offset"] = query.offset;
  }
  if (query.order) {
    apiParams["order"] = query.order;
  }
  if (query.tagMode) {
    apiParams["tagMode"] = query.tagMode;
  }
  if (query.deleted) {
    apiParams["deleted"] = query.deleted;
  }
  if (query.tag && query.tag.length > 0) {
    if (typeof query.tag === "string") {
      query.tag = [query.tag];
    }
    apiParams["tags"] = JSON.stringify(query.tag);
  }

  // View mode for restricting global admin users to only see their own recordings.
  if (!shouldViewAsSuperUser()) {
    apiParams["view-mode"] = "user";
  }
  return apiParams;
}

function queryVisits(
  queryParams: RecordingQuery
): Promise<FetchResult<VisitsQueryResult>> {
  return CacophonyApi.get(
    `${apiPath}/visits?${querystring.stringify(makeApiQuery(queryParams))}`
  );
}

function queryCount(
  queryParams: RecordingQuery
): Promise<FetchResult<QueryResultCount>> {
  return CacophonyApi.get(
    `${apiPath}/count?${querystring.stringify(makeApiQuery(queryParams))}`
  );
}

function id(
  id: RecordingId,
  deleted: boolean = false
): Promise<
  FetchResult<{
    recording: ApiRecordingResponse;
    rawSize?: number; // CPTV size
    fileSize?: number; // MP4 size
    downloadFileJWT?: JwtToken<Mp4File>;
    downloadRawJWT?: JwtToken<CptvFile>;
  }>
> {
  return CacophonyApi.get(`${apiPath}/${id}?deleted=${deleted}`);
}

function comment(comment: string, id: RecordingId): Promise<FetchResult<any>> {
  return CacophonyApi.patch(`${apiPath}/${id}`, {
    updates: {
      comment,
    },
  });
}

function del(id: RecordingId): Promise<FetchResult<any>> {
  return CacophonyApi.delete(`${apiPath}/${id}`);
}

function undelete(id: RecordingId): Promise<FetchResult<any>> {
  return CacophonyApi.patch(`${apiPath}/${id}/undelete`, {});
}

function tracks(
  recordingId: RecordingId
): Promise<FetchResult<{ tracks: ApiTrackResponse[] }>> {
  return CacophonyApi.get(`${apiPath}/${recordingId}/tracks`);
}

function replaceTrackTag(
  tag: ApiTrackTagRequest,
  recordingId: RecordingId,
  trackId: TrackId
): Promise<FetchResult<{ trackTagId?: number }>> {
  const body: ApiTrackTagRequest = {
    ...tag,
    automatic: false,
  };
  return CacophonyApi.post(
    `${apiPath}/${recordingId}/tracks/${trackId}/replaceTag`,
    body
  );
}

function addTrackTag(
  tag: ApiTrackTagRequest,
  recordingId: RecordingId,
  trackId: TrackId,
  tagJWT?: JwtToken<TrackTag>
): Promise<FetchResult<{ trackTagId: number; success: boolean }>> {
  const body: ApiTrackTagRequest = {
    what: tag.what,
    confidence: tag.confidence,
    automatic: false,
  };
  if (tagJWT !== undefined) {
    body.tagJWT = tagJWT;
  }
  return CacophonyApi.post(
    `${apiPath}/${recordingId}/tracks/${trackId}/tags`,
    body
  );
}

function deleteTrackTag(
  id: RecordingId,
  trackId: TrackId,
  trackTagId: TrackTagId,
  tagJWT?: JwtToken<TrackTag>
): Promise<FetchResult<any>> {
  let requestUri = `${apiPath}/${id}/tracks/${trackId}/tags/${trackTagId}`;
  if (tagJWT !== undefined) {
    requestUri += `?tagJWT=${tagJWT}`;
  }
  return CacophonyApi.delete(requestUri);
}

function addRecordingTag(
  tag: ApiRecordingTagRequest,
  id: RecordingId
): Promise<FetchResult<{ tagId: TagId }>> {
  return CacophonyApi.post(`${apiPath}/${id}/tags`, {
    tag,
  });
}

function deleteRecordingTag(
  tagId: TagId,
  id: RecordingId
): Promise<FetchResult<void>> {
  return CacophonyApi.delete(`${apiPath}/${id}/tags/${tagId}`);
}

function reprocess(id: RecordingId): Promise<FetchResult<void>> {
  return CacophonyApi.get(`/api/v1/reprocess/${id}`);
}

function thumbnail(id: RecordingId): string {
  return CacophonyApi.url(`/api/v1/recordings/${id}/thumbnail`);
}

interface RecordingToTag {
  RecordingId: RecordingId;
  DeviceId: DeviceId;
  tracks: Track[];
  duration: number;
  fileKey: string;
  fileMimeType: string;
  recordingDateTime: string;
  recordingJWT: string;
  tagJWT: string;
  fileSize: number;
}

// eslint-disable-next-line no-unused-vars,@typescript-eslint/no-unused-vars
export const needsTag = async (
  biasToDeviceId?: DeviceId
): Promise<FetchResult<QueryResult<RecordingToTag>>> => {
  let requestUri = `${apiPath}/needs-tag`;
  if (biasToDeviceId != null) {
    requestUri += `?deviceId=${biasToDeviceId}`;
  }
  return CacophonyApi.get(requestUri);
};

export function calculateFromTime(query: RecordingQuery): string {
  if (query.hasOwnProperty("from") && query.from && query.from.length > 0) {
    return query.from;
  }

  if (query.hasOwnProperty("days") && query.days && query.days !== "all") {
    // For the previous x days we want to do it at the time the submit is pressed and not cache it.
    // they could have had the window open for a few days.
    const now = new Date();
    return moment(now)
      .add(-1 * query.days, "days")
      .format("YYYY-MM-DD HH:mm:ss");
  }

  return null;
}

export function latestForDevice(
  deviceId: DeviceId
): Promise<
  SuccessFetchResult<QueryResult<ApiRecordingResponse>> | FailureFetchResult
> {
  return query({
    limit: 1,
    days: "all",
    device: [deviceId],
  });
}

export default {
  query,
  queryVisits,
  queryCount,
  id,
  thumbnail,
  comment,
  del,
  undelete,
  tracks,
  reprocess,
  addTrackTag,
  deleteTrackTag,
  replaceTrackTag,
  addRecordingTag,
  deleteRecordingTag,
  makeApiQuery,
  needsTag,
  latestForDevice,
};
