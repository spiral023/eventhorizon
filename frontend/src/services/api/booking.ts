import type { ApiResult } from "@/types/api";
import type { BookingRequestInput } from "./types";
import { getMockAdapter, request, USE_MOCKS } from "./core";

export async function sendBookingRequest(
  activityId: string,
  requestData: BookingRequestInput
): Promise<ApiResult<void>> {
  if (USE_MOCKS) {
    const mock = await getMockAdapter();
    return mock.sendBookingRequest(activityId, requestData);
  }

  const apiPayload = {
    activity_id: activityId,
    participant_count: requestData.participantCount,
    requested_date: requestData.requestedDate,
    start_time: requestData.startTime,
    end_time: requestData.endTime,
    notes: requestData.notes,
    contact_name: requestData.contactName,
    contact_email: requestData.contactEmail,
    contact_phone: requestData.contactPhone,
  };

  return request<void>(`/activities/${activityId}/booking-request`, {
    method: "POST",
    body: JSON.stringify(apiPayload),
  });
}
