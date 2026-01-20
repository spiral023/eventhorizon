import type {
  Activity,
  ActivityComment,
  ActivityVote,
  BudgetType,
  DateResponseType,
  Event,
  EventCategory,
  EventComment,
  EventPhase,
  PrimaryGoal,
  Region,
  Room,
  Season,
  User,
} from "@/types/domain";
import type {
  ApiActivity,
  ApiActivityComment,
  ApiActivityVote,
  ApiActivityVoteInner,
  ApiDateOption,
  ApiDateResponse,
  ApiEvent,
  ApiEventComment,
  ApiEventParticipant,
  ApiRoom,
  ApiUser,
} from "@/types/apiDomain";

export function mapUserFromApi(apiUser: ApiUser): User {
  if (!apiUser) return undefined as unknown as User;
  return {
    id: apiUser.id,
    email: apiUser.email,
    firstName: apiUser.first_name,
    lastName: apiUser.last_name,
    name: `${apiUser.first_name} ${apiUser.last_name}`.trim(),
    avatarUrl: apiUser.avatar_url,
    phone: apiUser.phone,
    department: apiUser.department,
    position: apiUser.position,
    location: apiUser.location,
    birthday: apiUser.birthday,
    bio: apiUser.bio,
    hobbies: apiUser.hobbies || [],
    activityPreferences: apiUser.activity_preferences,
    dietaryRestrictions: apiUser.dietary_restrictions || [],
    allergies: apiUser.allergies || [],
    createdAt: apiUser.created_at,
    isActive: apiUser.is_active,
    favoriteActivityIds: apiUser.favorite_activity_ids,
  } as unknown as User;
}

export function mapRoomFromApi(apiRoom: ApiRoom): Room {
  if (!apiRoom) return apiRoom as unknown as Room;
  return {
    id: apiRoom.id,
    name: apiRoom.name,
    description: apiRoom.description,
    inviteCode: apiRoom.invite_code || apiRoom.inviteCode,
    memberCount: apiRoom.member_count ?? apiRoom.memberCount ?? 0,
    createdAt: apiRoom.created_at ?? apiRoom.createdAt,
    createdByUserId: apiRoom.created_by_user_id ?? apiRoom.createdByUserId,
    avatarUrl: apiRoom.avatar_url ?? apiRoom.avatarUrl,
    members: (apiRoom.members || []).map((member) => ({
      userId: member.user_id ?? member.userId,
      userName: member.user_name ?? member.userName ?? member.name,
      avatarUrl: member.avatar_url ?? member.avatarUrl,
      role: member.role,
      joinedAt: member.joined_at ?? member.joinedAt,
    })),
  };
}

export function mapActivityFromApi(apiActivity: ApiActivity): Activity {
  return {
    id: apiActivity.id,
    slug: apiActivity.slug,
    title: apiActivity.title,
    category: apiActivity.category as EventCategory,
    tags: apiActivity.tags || [],
    locationRegion: apiActivity.location_region as Region,
    locationCity: apiActivity.location_city,
    locationAddress: apiActivity.address || apiActivity.location_address,
    coordinates: apiActivity.coordinates,
    estPricePerPerson: apiActivity.est_price_pp || apiActivity.est_price_per_person,
    priceComment: apiActivity.price_comment,
    shortDescription: apiActivity.short_description,
    longDescription: apiActivity.long_description,
    customerVoice: apiActivity.customer_voice,
    imageUrl: apiActivity.image_url,
    galleryUrls: apiActivity.gallery_urls || [],
    season: apiActivity.season as Season,
    typicalDurationHours: apiActivity.typical_duration_hours,
    recommendedGroupSizeMin: apiActivity.recommended_group_size_min,
    recommendedGroupSizeMax: apiActivity.recommended_group_size_max,
    groupSizeMin: apiActivity.recommended_group_size_min,
    groupSizeMax: apiActivity.recommended_group_size_max,
    minParticipants: apiActivity.recommended_group_size_min,
    maxCapacity: apiActivity.max_capacity,
    physicalIntensity: apiActivity.physical_intensity,
    mentalChallenge: apiActivity.mental_challenge,
    socialInteractionLevel: apiActivity.social_interaction_level,
    competitionLevel: apiActivity.competition_level,
    accessibilityFlags: apiActivity.accessibility_flags || [],
    weatherDependent: apiActivity.weather_dependent,
    externalRating: apiActivity.external_rating,
    favoritesCount: apiActivity.favorites_count || apiActivity.favoritesCount || 0,
    favoritesInRoomCount: apiActivity.favorites_in_room_count ?? apiActivity.favoritesInRoomCount,
    totalUpvotes: apiActivity.total_upvotes ?? apiActivity.totalUpvotes ?? 0,
    primaryGoal: apiActivity.primary_goal as PrimaryGoal,
    travelTimeMinutes: apiActivity.travel_time_from_office_minutes,
    travelTimeMinutesWalking: apiActivity.travel_time_from_office_minutes_walking,
    provider: apiActivity.provider,
    website: apiActivity.website,
    reservationUrl: apiActivity.reservation_url,
    menuUrl: apiActivity.menu_url,
    facebook: apiActivity.facebook,
    instagram: apiActivity.instagram,
    outdoorSeating: apiActivity.outdoor_seating,
    contactPhone: apiActivity.phone || apiActivity.contact_phone,
    contactEmail: apiActivity.email || apiActivity.contact_email,
    createdAt: apiActivity.created_at,
    updatedAt: apiActivity.updated_at,
  };
}

export function mapEventFromApi(apiEvent: ApiEvent): Event {
  if (!apiEvent) return apiEvent as unknown as Event;

  let activityVotes: ActivityVote[] = [];
  const rawVotes = apiEvent.activity_votes || [];

  if (rawVotes.length > 0 && (rawVotes[0] as ApiActivityVote).votes !== undefined) {
    activityVotes = rawVotes.map((av: ApiActivityVote) => ({
      ...av,
      activityId: av.activity_id || av.activityId,
      votes: (av.votes || []).map((v: ApiActivityVoteInner) => ({
        ...v,
        userId: v.user_id,
        userName: v.user_name,
        votedAt: v.voted_at,
      })),
    }));
  } else {
    const votesByActivity = new Map<string, ApiActivityVoteInner[]>();
    const proposedIds = apiEvent.proposed_activity_ids || [];

    proposedIds.forEach((activityId: string) => {
      votesByActivity.set(activityId, []);
    });

    (rawVotes as unknown as { activity_id: string }[]).forEach((vote: ApiActivityVoteInner) => {
      const activityId = vote.activity_id || vote.activityId;
      if (!votesByActivity.has(activityId)) {
        votesByActivity.set(activityId, []);
      }
      votesByActivity.get(activityId)!.push({
        userId: vote.user_id || vote.userId,
        userName: vote.user_name || vote.userName,
        vote: vote.vote,
        votedAt: vote.voted_at || vote.votedAt,
      });
    });

    activityVotes = Array.from(votesByActivity.entries()).map(([activityId, votes]) => ({
      activityId,
      votes: votes,
    }));
  }

  return {
    id: apiEvent.id,
    shortCode: apiEvent.short_code || apiEvent.shortCode,
    roomId: apiEvent.room_id,
    name: apiEvent.name,
    description: apiEvent.description,
    phase: apiEvent.phase as EventPhase,
    timeWindow: apiEvent.time_window,
    votingDeadline: apiEvent.voting_deadline,
    budgetType: apiEvent.budget_type as BudgetType,
    budgetAmount: apiEvent.budget_amount,
    participantCountEstimate: apiEvent.participant_count_estimate,
    locationRegion: apiEvent.location_region as Region,
    avatarUrl: apiEvent.avatar_url,
    inviteSentAt: apiEvent.invite_sent_at,
    lastReminderAt: apiEvent.last_reminder_at,
    unreadMessageCount: apiEvent.unread_message_count,
    proposedActivityIds: apiEvent.proposed_activity_ids,
    excludedActivityIds: apiEvent.excluded_activity_ids || [],
    activityVotes: activityVotes,
    chosenActivityId: apiEvent.chosen_activity_id,
    dateOptions: (apiEvent.date_options || []).map((do_: ApiDateOption) => ({
      id: do_.id,
      date: do_.date,
      startTime: do_.start_time,
      endTime: do_.end_time,
      responses: (do_.responses || []).map((r: ApiDateResponse) => ({
        userId: r.user_id,
        userName: r.user_name,
        avatarUrl: r.user_avatar || r.avatar_url,
        response: r.response as DateResponseType,
        isPriority: r.is_priority,
        contribution: r.contribution,
      })),
    })),
    finalDateOptionId: apiEvent.final_date_option_id,
    participants: (apiEvent.participants || []).map((p: ApiEventParticipant) => ({
      userId: p.user_id,
      userName: p.user_name,
      avatarUrl: p.avatar_url,
      isOrganizer: p.is_organizer,
      hasVoted: p.has_voted,
      dateResponse: p.date_response as DateResponseType,
    })),
    createdAt: apiEvent.created_at,
    createdByUserId: apiEvent.created_by_user_id,
    updatedAt: apiEvent.updated_at,
  };
}

export function mapCommentFromApi(apiComment: ApiEventComment): EventComment {
  return {
    id: apiComment.id,
    eventId: apiComment.event_id,
    userId: apiComment.user_id,
    content: apiComment.content,
    phase: apiComment.phase as EventPhase,
    createdAt: apiComment.created_at,
    userName: apiComment.user_name,
    userAvatar: apiComment.user_avatar,
  };
}

export function mapActivityCommentFromApi(apiComment: ApiActivityComment): ActivityComment {
  return {
    id: apiComment.id,
    activityId: apiComment.activity_id || apiComment.activityId,
    userId: apiComment.user_id || apiComment.userId,
    content: apiComment.content,
    createdAt: apiComment.created_at || apiComment.createdAt,
    userName: apiComment.user_name || apiComment.userName,
    userAvatar: apiComment.user_avatar || apiComment.userAvatar,
  };
}
