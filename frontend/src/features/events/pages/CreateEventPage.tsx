import { AdminGate } from "../../auth/AdminAccess";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { saveEvent } from "../api/events.api";
import { eventDetailQuery, eventKeys } from "../api/events.queries";
import { EventInput } from "../event.types";
import Modal from "../../../components/ui/Modal";
import ErrorAlert from "../../../components/ui/ErrorAlert";
import EventForm from "../components/EventForm";

export default function CreateEventPage() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: EventInput) => saveEvent(input),
    onSuccess: async (event) => {
      // Prevent an older read from overwriting the server's authoritative write response.
      await client.cancelQueries({ queryKey: eventKeys.detail(event.id), exact: true });
      client.setQueryData(eventDetailQuery(event.id).queryKey, event);
      // Background list refreshes must not delay navigation to the newly created event.
      void client.invalidateQueries({ queryKey: eventKeys.lists });
      navigate(`/events/${encodeURIComponent(event.id)}`, { replace: true });
    },
  });
  const close = () => {
    if (!mutation.isPending) navigate("/events");
  };
  return (
    <Modal title="Create an event" onClose={close}>
      <AdminGate>
        {mutation.isError && (
          <ErrorAlert title="Could not create event" message={mutation.error.message} />
        )}
        <EventForm onSubmit={mutation.mutate} isPending={mutation.isPending}>
          <button
            type="button"
            className="button-text"
            disabled={mutation.isPending}
            onClick={close}
          >
            Cancel
          </button>
          <button className="button" disabled={mutation.isPending}>
            {mutation.isPending ? "Creating…" : "Create event"}
          </button>
        </EventForm>
      </AdminGate>
    </Modal>
  );
}
