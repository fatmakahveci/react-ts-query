# Visitor experience: 20 improvements

These features work with the existing React Events API. Browsing, saving and planning do not require an administrator key.

| #   | Improvement                                                                                       | Where to try it                                      |
| --- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 1   | An event spotlight prioritizes the next upcoming gathering and clearly labels historical records. | Discover, below the introduction                     |
| 2   | Category filters help visitors browse interests; administrators can categorize events.            | Discover → Category; create/edit form                |
| 3   | Date filters include upcoming, this weekend, this month and past events.                          | Discover → When                                      |
| 4   | A location selector narrows results to a venue or city.                                           | Discover → Location                                  |
| 5   | Sort by upcoming date, recently added or title. Historical dates sort newest first.               | Discover → Sort by                                   |
| 6   | Switch between a card grid and a compact list; the preference is remembered.                      | Discover → Grid / List                               |
| 7   | Browse months, see event counts and select a specific day.                                        | Discover → Calendar                                  |
| 8   | Save or unsave an event from its card or details, with a visible selected state.                  | Heart button                                         |
| 9   | A dedicated saved collection keeps favourite events together.                                     | Navigation → Saved                                   |
| 10  | Build a personal plan from upcoming events, then remove items or undo removal.                    | Event details → Add to my plan; navigation → My plan |
| 11  | Revisit the last three available events viewed on this device.                                    | Discover → Recently viewed                           |
| 12  | Discover related events sharing a category or location.                                           | Event details → More in your world                   |
| 13  | Download an escaped, UTF-8-safe iCalendar file for an event.                                      | Event details → Add to calendar                      |
| 14  | Share through the native share sheet, copy a link or select a fallback URL.                       | Event details → Share event                          |
| 15  | Open directions to the listed location in Google Maps.                                            | Event details → Get directions                       |
| 16  | Choose light, dark or system appearance, with a persistent preference.                            | Navigation → Color theme                             |
| 17  | Card skeletons indicate that event results and collections are loading.                           | Discover and collections during loading              |
| 18  | Accessible notifications confirm save/plan changes and provide Undo without a time limit.         | After saving or changing a plan                      |
| 19  | Press `/` to focus search, reuse up to five recent searches or clear that history.                | Discover → search                                    |
| 20  | A dismissible introduction explains discovery, saving and planning; it can be reopened.           | Discover → How it works                              |

## Behaviour and storage

Search, category, date, location, sort and selected-day filters are represented in the URL. Search keeps the other filters intact. Unsupported filter values and impossible dates fall back to defaults; search and location text respect the API's 200-character limits. The calendar counts reflect the current search and filters. Selecting a day narrows the event list; clearing the selection restores it. Month navigation changes the calendar without silently removing the selected-day filter, which remains visible with a clear button. When browser navigation changes the selected date, the calendar follows its month. Reset filters also clears custom sorting.

Saved events, plans, recently viewed IDs, recent search terms, appearance and display preferences are stored under `react-events:visitor:*` in browser local storage. They are device/browser specific and do not sync between devices. If browser storage is blocked or full, changes work in memory for the current page. Collections keep at most 100 event IDs, recently viewed history keeps eight, and search history keeps five. Unavailable events can be removed from collections explicitly. Clearing browser data removes these preferences. Administrator credentials remain exclusively in tab memory.

A personal plan is **not a reservation, ticket, registration or confirmed attendance**. The UI explains this beside the action and on the collection page. Past events remain available to explore and save, but cannot be newly added to a future plan. An event already in a plan can still be removed after it has passed.

Existing records and their dates are unchanged. Events without a category appear under Community; no popularity, reviews, attendance numbers or availability are invented. The spotlight uses the nearest future event, or the most recent historical event with an archive label.

Event dates are stored as local wall time without a timezone or end time. Date filters use the visitor's local clock. Calendar export preserves the displayed wall time as floating time and does not invent a duration; users travelling across timezones should check the venue's local time. iCalendar text escapes newlines and delimiters and folds lines at 75 UTF-8 bytes. See [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545.html).

Sharing uses [Web Share](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share) when available, with clipboard and selectable-text fallbacks. Cancelling the share sheet does not copy anything. Directions use the official [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started) format; the destination is the listed location, without geocoding or an embedded tracking SDK.

## Verification

Automated tests cover filter composition and weekend boundaries, category validation and persistence, preference corruption and storage denial, cross-tab updates, collection/plan undo, theme persistence, keyboard search, calendar selection/export, sharing and the existing secured administrator workflows. Browser checks cover the same visitor journeys at desktop sizes and mobile widths of 320, 390 and 768 pixels with isolated temporary event records.
