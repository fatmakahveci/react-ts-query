import { queryOptions } from "@tanstack/react-query";
import { fetchEvent, fetchEvents, fetchImages } from "./events.api";

// Separate list keys let mutations refresh discovery without refetching newly saved details.
export const eventKeys = {
  all: ["events"] as const,
  lists: ["events", "list"] as const,
  list: (search: string) => ["events", "list", { search }] as const,
  detail: (id: string) => ["events", "detail", id] as const,
  images: ["event-images"] as const,
};

export function eventListQuery(search = "") {
  return queryOptions({
    queryKey: eventKeys.list(search),
    queryFn: ({ signal }) => fetchEvents(search, signal),
  });
}

export function eventDetailQuery(id: string) {
  return queryOptions({
    queryKey: eventKeys.detail(id),
    queryFn: ({ signal }) => fetchEvent(id, signal),
  });
}

export const eventImagesQuery = queryOptions({
  queryKey: eventKeys.images,
  queryFn: fetchImages,
  staleTime: Infinity,
});
