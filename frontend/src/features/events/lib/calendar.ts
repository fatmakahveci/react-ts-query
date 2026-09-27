import { EventType } from "../event.types";

// Escape delimiters and newlines so event text cannot introduce extra iCalendar properties.
const escapeText = (text: string) =>
  text
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
function fold(line: string) {
  // RFC 5545 folds at 75 UTF-8 bytes; the continuation space also counts toward that limit.
  const encoder = new TextEncoder();
  let result = "",
    length = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    if (length + bytes > 75) {
      result += "\r\n ";
      length = 1;
    }
    result += char;
    length += bytes;
  }
  return result;
}
export function calendarFile(event: EventType, origin: string, now = new Date()) {
  // The API has no timezone or end time: preserve floating local DTSTART and omit DTEND.
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//React Events//Event calendar//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${encodeURIComponent(event.id)}@react-events.local`,
    `DTSTAMP:${now
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "")}`,
    `DTSTART:${event.date.replace(/-/g, "")}T${event.time.replace(":", "")}00`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    `LOCATION:${escapeText(event.location)}`,
    `URL:${new URL(`/events/${encodeURIComponent(event.id)}`, origin).href}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ]
    .map(fold)
    .join("\r\n");
}
export function downloadCalendar(event: EventType) {
  const blob = new Blob([calendarFile(event, window.location.origin)], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${
    event.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 60) || "event"
  }.ics`;
  document.body.append(link);
  link.click();
  link.remove();
  // Give the browser time to consume the download URL before releasing the Blob.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
