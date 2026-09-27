export const EVENT_CATEGORIES = [
  "Community",
  "Workshops",
  "Networking",
  "Outdoors",
  "Culture",
] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];
export type EventInput = {
  title: string;
  description: string;
  date: string;
  time: string;
  image: string;
  location: string;
  category?: EventCategory;
};
export type EventType = EventInput & { id: string };
export type EventImage = { path: string; caption: string };
