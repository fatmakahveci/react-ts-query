import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { AdminAccessButton, AdminGate, AdminProvider } from "./AdminAccess";
import { request } from "../../lib/api-client";

const key = "test_" + "a".repeat(43);

test("requires sign in, displays failures and forgets access on sign out", async () => {
  const fetchMock = vi
    .spyOn(global, "fetch")
    .mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: "Invalid access key" }),
    } as Response)
    .mockResolvedValue({ ok: true, json: async () => ({ authenticated: true }) } as Response);
  const localWrite = vi.spyOn(localStorage, "setItem");
  const sessionWrite = vi.spyOn(Storage.prototype, "setItem");
  render(
    <AdminProvider>
      <AdminAccessButton />
      <AdminGate>
        <p>Event management</p>
      </AdminGate>
    </AdminProvider>,
  );
  expect(screen.queryByText("Event management")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Administrator access key"), { target: { value: key } });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Invalid access key");
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByText("Event management")).toBeInTheDocument();
  expect(new Headers(fetchMock.mock.calls.at(-1)?.[1]?.headers).get("Authorization")).toBe(
    `Bearer ${key}`,
  );
  expect(localWrite).not.toHaveBeenCalled();
  expect(sessionWrite).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
  await waitFor(() => expect(screen.queryByText("Event management")).not.toBeInTheDocument());
});

test("opens and closes the administrator dialog", async () => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  vi.spyOn(global, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ authenticated: true }),
  } as Response);
  render(
    <AdminProvider>
      <AdminAccessButton />
    </AdminProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Admin sign in" }));
  expect(screen.getByRole("dialog", { name: "Administrator access" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Admin sign in" }));
  fireEvent.change(screen.getByLabelText("Administrator access key"), { target: { value: key } });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByRole("button", { name: "Sign out" })).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("a revoked key closes protected content and is not reused by later writes", async () => {
  const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ authenticated: true }),
  } as Response);
  render(
    <AdminProvider>
      <AdminGate>
        <p>Event management</p>
      </AdminGate>
    </AdminProvider>,
  );
  fireEvent.change(screen.getByLabelText("Administrator access key"), { target: { value: key } });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  await screen.findByText("Event management");
  fetchMock.mockResolvedValueOnce({
    ok: false,
    status: 401,
    json: async () => ({ message: "Access revoked" }),
  } as Response);
  await act(async () => {
    await expect(request("/events/e1", { method: "DELETE" })).rejects.toThrow("Access revoked");
  });
  expect(screen.queryByText("Event management")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Administrator access key")).toHaveValue("");
  await request("/events/e1", { method: "DELETE" });
  expect(new Headers(fetchMock.mock.calls.at(-1)?.[1]?.headers).has("Authorization")).toBe(false);
});
