import { EventType, EventInput, EventImage } from "../event.types";

import { API_BASE_URL, request } from "../../../lib/api-client";

export const imageUrl = (image: string) => `${API_BASE_URL}/${image}`;

export async function fetchEvents(searchTerm: string, signal?: AbortSignal): Promise<EventType[]> {
  const { events } = await request<{ events: EventType[] }>(
    `/events${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ""}`,
    { signal },
  );
  return events;
}
export async function fetchEvent(id: string, signal?: AbortSignal): Promise<EventType> {
  const { event } = await request<{ event: EventType }>(`/events/${encodeURIComponent(id)}`, {
    signal,
  });
  return event;
}
export async function fetchImages({ signal }: { signal?: AbortSignal } = {}): Promise<
  EventImage[]
> {
  const { images } = await request<{ images: EventImage[] }>("/events/images", { signal });
  return images;
}
export async function saveEvent(input: EventInput, id?: string): Promise<EventType> {
  const { event } = await request<{ event: EventType }>(
    id ? `/events/${encodeURIComponent(id)}` : "/events",
    {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: input }),
    },
  );
  return event;
}
export async function deleteEvent(id: string): Promise<void> {
  await request(`/events/${encodeURIComponent(id)}`, { method: "DELETE" });
}
