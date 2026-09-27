import { AdminGate } from "../../auth/AdminAccess";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { saveEvent } from "../api/events.api";
import { eventDetailQuery, eventKeys } from "../api/events.queries";
import { EventInput } from "../event.types";
import Modal from "../../../components/ui/Modal";
import ErrorAlert from "../../../components/ui/ErrorAlert";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import EventForm from "../components/EventForm";

export default function EditEventPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const query = useQuery(eventDetailQuery(id));
  const mutation = useMutation({
    mutationFn: (input: EventInput) => saveEvent(input, id),
    onSuccess: async (event) => {
      // Cancel stale reads before publishing the saved version to detail-page subscribers.
      await client.cancelQueries({ queryKey: eventKeys.detail(id), exact: true });
      client.setQueryData(eventDetailQuery(id).queryKey, event);
      // A slow list refresh should not keep a successfully saved form open.
      void client.invalidateQueries({ queryKey: eventKeys.lists });
      navigate(`/events/${encodeURIComponent(id)}`, { replace: true });
    },
  });
  const close = () => {
    if (!mutation.isPending) navigate(`/events/${encodeURIComponent(id)}`);
  };
  return (
    <Modal title="Edit event" onClose={close}>
      <AdminGate>
        {query.isPending && <LoadingSpinner />}
        {query.isError && <ErrorAlert title="Could not load event" message={query.error.message} />}
        {mutation.isError && (
          <ErrorAlert title="Could not save changes" message={mutation.error.message} />
        )}
        {query.data && (
          <EventForm
            key={id}
            inputData={query.data}
            onSubmit={mutation.mutate}
            isPending={mutation.isPending}
          >
            <button
              type="button"
              className="button-text"
              disabled={mutation.isPending}
              onClick={close}
            >
              Cancel
            </button>
            <button className="button" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save changes"}
            </button>
          </EventForm>
        )}
      </AdminGate>
    </Modal>
  );
}
