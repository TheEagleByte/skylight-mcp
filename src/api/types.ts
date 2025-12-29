/**
 * TypeScript types for Skylight API responses (JSON:API format)
 */

// Base JSON:API structures
export interface JsonApiResourceId {
  type: string;
  id: string;
}

export interface JsonApiResponse<D, I = unknown> {
  data: D;
  included?: I[];
  meta?: Record<string, unknown>;
}

// Category (Family Member) types
export interface CategoryAttributes {
  label: string | null;
  color: string | null;
  selected_for_chore_chart: boolean | null;
  linked_to_profile: boolean | null;
  profile_pic_url: string | null;
}

export interface CategoryResource {
  type: "category";
  id: string;
  attributes: CategoryAttributes;
}

// Chore types
export interface ChoreAttributes {
  id?: number | null;
  summary: string;
  status: string;
  start: string;
  start_time: string | null;
  completed_on: string | null;
  is_future: boolean | null;
  recurring: boolean;
  recurring_until: string | null;
  recurrence_set: string | null;
  reward_points: number | null;
  emoji_icon: string | null;
  routine: boolean | null;
  position: number | null;
}

export interface ChoreRelationships {
  category?: {
    data: JsonApiResourceId | null;
  };
}

export interface ChoreResource {
  type: "chore";
  id: string;
  attributes: ChoreAttributes;
  relationships?: ChoreRelationships;
}

// List types
export interface ListAttributes {
  label: string;
  color: string | null;
  kind: "shopping" | "to_do";
  default_grocery_list: boolean;
}

export interface ListRelationships {
  list_items?: {
    data: JsonApiResourceId[];
  };
}

export interface ListResource {
  type: "list";
  id: string;
  attributes: ListAttributes;
  relationships?: ListRelationships;
}

// List Item types
export interface ListItemAttributes {
  label: string;
  status: "pending" | "completed";
  section: string | null;
  position: number | null;
  created_at: string | null;
}

export interface ListItemResource {
  type: "list_item";
  id: string;
  attributes: ListItemAttributes;
}

// Task Box Item types
export interface TaskBoxItemAttributes {
  id?: number | null;
  summary: string;
  emoji_icon: string | null;
  routine: boolean | null;
  reward_points: number | null;
}

export interface TaskBoxItemResource {
  type: "task_box_item";
  id: string;
  attributes: TaskBoxItemAttributes;
}

// Frame types
export interface FrameAttributes {
  [key: string]: unknown;
}

export interface FrameResource {
  type: "frame";
  id: string;
  attributes: FrameAttributes;
}

// Calendar types
export interface SourceCalendarAttributes {
  [key: string]: unknown;
}

export interface SourceCalendarResource {
  type: "source_calendar";
  id: string;
  attributes: SourceCalendarAttributes;
}

export interface CalendarEventAttributes {
  [key: string]: unknown;
}

export interface CalendarEventResource {
  type: "calendar_event";
  id: string;
  attributes: CalendarEventAttributes;
}

// Device types
export interface DeviceAttributes {
  [key: string]: unknown;
}

export interface DeviceResource {
  type: "device";
  id: string;
  attributes: DeviceAttributes;
}

// Reward types
export interface RewardAttributes {
  [key: string]: unknown;
}

export interface RewardResource {
  type: "reward";
  id: string;
  attributes: RewardAttributes;
}

export interface RewardPointAttributes {
  [key: string]: unknown;
}

export interface RewardPointResource {
  type: "reward_point";
  id: string;
  attributes: RewardPointAttributes;
}

// API Response types
export type ChoresResponse = JsonApiResponse<ChoreResource[], CategoryResource>;
export type ChoreResponse = JsonApiResponse<ChoreResource, CategoryResource>;
export type ListsResponse = JsonApiResponse<ListResource[]>;
export type ListResponse = JsonApiResponse<ListResource, ListItemResource>;
export type CategoriesResponse = JsonApiResponse<CategoryResource[]>;
export type DevicesResponse = JsonApiResponse<DeviceResource[]>;
export type FrameResponse = JsonApiResponse<FrameResource>;
export type SourceCalendarsResponse = JsonApiResponse<SourceCalendarResource[]>;
export type CalendarEventsResponse = JsonApiResponse<CalendarEventResource[], CategoryResource | SourceCalendarResource>;
export type TaskBoxItemResponse = JsonApiResponse<TaskBoxItemResource>;
export type RewardsResponse = JsonApiResponse<RewardResource[]>;
export type RewardPointsResponse = JsonApiResponse<RewardPointResource[]>;

// Request body types for creating resources
export interface CreateChoreRequest {
  data: {
    type: "chore";
    attributes: Partial<ChoreAttributes>;
    relationships?: ChoreRelationships;
  };
}

export interface CreateTaskBoxItemRequest {
  data: {
    type: "task_box_item";
    attributes: Partial<TaskBoxItemAttributes>;
  };
}
