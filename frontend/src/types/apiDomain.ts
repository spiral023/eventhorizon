export interface ApiUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  phone?: string;
  company_id?: number;
  department?: string;
  position?: string;
  location?: string;
  birthday?: string;
  bio?: string;
  hobbies?: string[];
  activity_preferences?: unknown; // This will need further refinement if 'any' is not desired
  dietary_restrictions?: string[];
  allergies?: string[];
  created_at?: string;
  is_active?: boolean;
  favorite_activity_ids?: string[];
}

export interface ApiRoomMember {
  id?: string;
  user_id?: string;
  user_name?: string;
  name?: string; // Alias for user_name
  avatar_url?: string;
  role: string;
  joined_at: string;
}

export interface ApiRoom {
  id: string;
  name: string;
  description?: string;
  invite_code: string;
  inviteCode?: string; // Alias for invite_code
  member_count: number;
  memberCount?: number; // Alias for member_count
  created_at: string;
  createdAt?: string; // Alias for created_at
  created_by_user_id: string;
  createdByUserId?: string; // Alias for created_by_user_id
  avatar_url?: string;
  avatarUrl?: string; // Alias for avatar_url
  members?: ApiRoomMember[];
}

export interface ApiActivity {
  id: string;
  slug: string;
  title: string;
  category: string;
  tags: string[];
  location_region: string;
  location_city?: string;
  location_address?: string;
  address?: string; // Alias
  coordinates?: [number, number];
  location_coordinates?: [number, number];
  est_price_pp?: number; // Alias
  est_price_per_person?: number;
  price_comment?: string;
  short_description: string;
  long_description?: string;
  customer_voice?: string;
  image_url: string;
  gallery_urls?: string[];
  season: string;
  duration?: string;
  typical_duration_hours?: number;
  group_size_min?: number;
  group_size_max?: number;
  min_participants?: number; // Alias
  recommended_group_size_min?: number;
  recommended_group_size_max?: number;
  max_capacity?: number;
  physical_intensity?: number;
  mental_challenge?: number;
  social_interaction_level?: number;
  competition_level?: number;
  fun_factor?: number;
  teamwork_level?: number;
  accessibility_flags?: string[];
  weather_dependent?: boolean;
  external_rating?: number;
  review_count?: number;
  favorites_count?: number;
  favoritesCount?: number; // Alias
  favorites_in_room_count?: number;
  favoritesInRoomCount?: number; // Alias
  total_upvotes?: number;
  totalUpvotes?: number; // Alias
  primary_goal?: string;
  travel_time_from_office_minutes?: number;
  travel_time_from_office_minutes_walking?: number;
  travelTimeMinutes?: number; // Alias
  travelTimeMinutesWalking?: number; // Alias
  lead_time_min_days?: number;
  preparation_needed?: string;
  equipment_provided?: boolean;
  provider?: string;
  website?: string;
  reservation_url?: string;
  menu_url?: string;
  facebook?: string;
  instagram?: string;
  outdoor_seating?: boolean;
  contact_email?: string;
  contact_phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApiDateResponse {
  user_id: string;
  user_name?: string;
  avatar_url?: string;
  user_avatar?: string; // Alias
  response: string;
  is_priority?: boolean;
  contribution?: number;
  note?: string;
}

export interface ApiDateOption {
  id: string;
  date: string; // ISO date
  start_time?: string; // HH:mm
  end_time?: string;
  responses: ApiDateResponse[];
}

export interface ApiActivityVoteInner {
  user_id: string;
  user_name?: string;
  vote: string;
  voted_at: string;
}

export interface ApiActivityVote {
  activity_id: string;
  activityId?: string; // Alias
  votes: ApiActivityVoteInner[];
}

export interface ApiEventParticipant {
  user_id: string;
  user_name?: string;
  avatar_url?: string;
  is_organizer: boolean;
  has_voted: boolean;
  date_response?: string;
}

export interface ApiEvent {
  id: string;
  room_id: string;
  short_code: string;
  shortCode?: string; // Alias
  name: string;
  description?: string;
  phase: string;
  time_window: ApiEventTimeWindow; // This needs more precise typing
  voting_deadline: string;
  budget_type: string;
  budget_amount: number;
  participant_count_estimate?: number;
  location_region: string;
  avatar_url?: string;
  invite_sent_at?: string;
  last_reminder_at?: string;
  unread_message_count?: number;
  proposed_activity_ids: string[];
  excluded_activity_ids?: string[];
  activity_votes: ApiActivityVote[];
  chosen_activity_id?: string;
  date_options: ApiDateOption[];
  final_date_option_id?: string;
  participants: ApiEventParticipant[];
  created_at: string;
  created_by_user_id: string;
  updated_at?: string;
}

export interface ApiUserStats {
  upcoming_events_count: number;
  open_votes_count: number;
}

export interface ApiEventComment {
  id: string;
  event_id: string;
  user_id: string;
  content: string;
  phase: string;
  created_at: string;
  user_name?: string;
  user_avatar?: string;
}

export interface ApiActivityComment {
  id: string;
  activity_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_name?: string;
  user_avatar?: string;
}

export interface ApiTokenResponse {
  access_token: string;
  token_type: string;
  user: ApiUser;
}

export interface ApiUserUpdate {
  first_name?: string;
  last_name?: string;
  phone?: string;
  company_id?: number | null;
  department?: string;
  position?: string;
  location?: string;
  birthday?: string;
  bio?: string;
  hobbies?: string[];
  activity_preferences?: unknown;
  dietary_restrictions?: string[];
  allergies?: string[];
  avatar_url?: string;
}

export interface ApiAvatarUploadInfo {
  upload_url: string;
  uploadUrl?: string; // Alias
  public_url: string;
  publicUrl?: string; // Alias
  upload_key: string;
  uploadKey?: string; // Alias
}

export interface ApiRoomUpdate {
  name?: string;
  description?: string;
  avatar_url?: string;
}

export interface ApiCreateEvent {
  name: string;
  description?: string;
  time_window: ApiEventTimeWindow;
  voting_deadline: string;
  budget_type: string;
  budget_amount: number;
  participant_count_estimate?: number;
  location_region: string;
  proposed_activity_ids: string[];
}

export interface ApiEventUpdate {
  name?: string;
  description?: string;
  budget_type?: string;
  budget_amount?: number;
  avatar_url?: string;
  invite_sent_at?: string;
  last_reminder_at?: string;
  unread_message_count?: number;
}

export interface ApiSentCount {
  sent?: number;
  count?: number;
}

export interface ApiEventTimeWindowSeason {
  type: "season";
  value: string; // Season
}

export interface ApiEventTimeWindowMonth {
  type: "month";
  value: number; // Month 1-12
}

export interface ApiEventTimeWindowWeekRange {
  type: "weekRange";
  from_week: number;
  to_week: number;
}

export interface ApiEventTimeWindowFreeText {
  type: "freeText";
  value: string;
}

export type ApiEventTimeWindow =
  | ApiEventTimeWindowSeason
  | ApiEventTimeWindowMonth
  | ApiEventTimeWindowWeekRange
  | ApiEventTimeWindowFreeText;

export interface ApiSearchResult {
  activities: ApiActivity[];
  rooms: ApiRoom[];
  events: ApiEvent[];
  users: ApiUser[];
}




