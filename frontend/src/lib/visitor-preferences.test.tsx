import { act, renderHook } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import {
  removeVisitorItems,
  setPreference,
  updateVisitorList,
  useVisitorList,
} from "./visitor-preferences";

test("recent searches reject invalid persisted entries and retain only five unique values", () => {
  localStorage.setItem(
    "react-events:visitor:searches",
    JSON.stringify([
      null,
      1,
      " ",
      "x".repeat(201),
      "one",
      "one",
      "two",
      "three",
      "four",
      "five",
      "six",
    ]),
  );
  const { result } = renderHook(() => useVisitorList("searches"));
  expect(result.current).toEqual(["one", "two", "three", "four", "five"]);
  act(() => updateVisitorList("searches", "two", true));
  expect(result.current).toEqual(["two", "one", "three", "four", "five"]);
  act(() => updateVisitorList("searches", "new", true));
  expect(result.current).toEqual(["new", "two", "one", "three", "four"]);
  expect(JSON.parse(localStorage.getItem("react-events:visitor:searches")!)).toEqual(
    result.current,
  );
});

test("bulk removal preserves newer additions and persists the collection once", () => {
  setPreference("saved", JSON.stringify(["deleted-1", "kept", "deleted-2"]));
  const { result } = renderHook(() => useVisitorList("saved"));
  act(() => updateVisitorList("saved", "newer", true));
  const write = vi.spyOn(localStorage, "setItem");
  act(() => removeVisitorItems("saved", ["deleted-1", "deleted-2"]));
  expect(result.current).toEqual(["newer", "kept"]);
  expect(write).toHaveBeenCalledOnce();
});

test("cross-tab storage updates and clears refresh only relevant persisted data", () => {
  setPreference("saved", JSON.stringify(["one"]));
  const { result } = renderHook(() => useVisitorList("saved"));
  act(() => {
    localStorage.setItem("react-events:visitor:saved", JSON.stringify(["two"]));
    window.dispatchEvent(new StorageEvent("storage", { key: "react-events:visitor:theme" }));
  });
  expect(result.current).toEqual(["one"]);
  act(() =>
    window.dispatchEvent(new StorageEvent("storage", { key: "react-events:visitor:saved" })),
  );
  expect(result.current).toEqual(["two"]);
  act(() => {
    localStorage.clear();
    window.dispatchEvent(new StorageEvent("storage", { key: null }));
  });
  expect(result.current).toEqual([]);
});

test("storage quota failure falls back to memory and recovers on the next successful write", () => {
  const write = vi.spyOn(localStorage, "setItem").mockImplementationOnce(() => {
    throw new DOMException("Full", "QuotaExceededError");
  });
  const { result } = renderHook(() => useVisitorList("plan"));
  act(() => updateVisitorList("plan", "first", true));
  expect(result.current).toEqual(["first"]);
  expect(localStorage.getItem("react-events:visitor:plan")).toBeNull();
  act(() => updateVisitorList("plan", "second", true));
  expect(result.current).toEqual(["second", "first"]);
  expect(JSON.parse(localStorage.getItem("react-events:visitor:plan")!)).toEqual(result.current);
  act(() => updateVisitorList("plan", "second", true));
  expect(write).toHaveBeenCalledTimes(2);
});
