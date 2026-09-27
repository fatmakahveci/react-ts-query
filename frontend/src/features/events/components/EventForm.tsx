import { FormEvent, ReactNode, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { EVENT_CATEGORIES, EventCategory, EventInput } from "../event.types";
import { eventImagesQuery } from "../api/events.queries";
import EventImagePicker from "./EventImagePicker";
import ErrorAlert from "../../../components/ui/ErrorAlert";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";

export default function EventForm({
  inputData,
  onSubmit,
  children,
  isPending = false,
}: {
  inputData?: EventInput;
  onSubmit: (data: EventInput) => void;
  children: ReactNode;
  isPending?: boolean;
}) {
  const [selectedImage, setSelectedImage] = useState(inputData?.image || "");
  const images = useQuery(eventImagesQuery);
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending || !selectedImage || !images.data?.length) return;
    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) || "").trim();
    onSubmit({
      title: value("title"),
      description: value("description"),
      date: value("date"),
      time: value("time"),
      location: value("location"),
      image: selectedImage,
      category: value("category") as EventCategory,
    });
  }
  return (
    <form id="event-form" onSubmit={handleSubmit}>
      <p className="form-intro">Bring people together. All fields are required.</p>
      <fieldset disabled={isPending} className="form-fields">
        <p className="control">
          <label htmlFor="title">Event title</label>
          <input
            autoFocus
            required
            maxLength={120}
            id="title"
            name="title"
            placeholder="Give your event a memorable name"
            defaultValue={inputData?.title}
          />
        </p>
        {images.isPending && <LoadingSpinner />}
        {images.isError && (
          <>
            <ErrorAlert title="Images unavailable" message={images.error.message} />
            <button type="button" className="button-text" onClick={() => images.refetch()}>
              Try again
            </button>
          </>
        )}
        {images.data &&
          (images.data.length ? (
            <EventImagePicker
              images={images.data}
              selectedImage={selectedImage}
              onSelect={setSelectedImage}
            />
          ) : (
            <p role="alert">No cover images are available. Please try again later.</p>
          ))}
        <p className="control">
          <label htmlFor="category">Category</label>
          <select id="category" name="category" defaultValue={inputData?.category || "Community"}>
            {EVENT_CATEGORIES.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </p>
        <p className="control">
          <label htmlFor="description">Description</label>
          <textarea
            required
            maxLength={5000}
            rows={4}
            id="description"
            name="description"
            placeholder="What can guests look forward to?"
            defaultValue={inputData?.description}
          />
        </p>
        <div className="controls-row">
          <p className="control">
            <label htmlFor="date">Date</label>
            <input required type="date" id="date" name="date" defaultValue={inputData?.date} />
          </p>
          <p className="control">
            <label htmlFor="time">Local time</label>
            <input required type="time" id="time" name="time" defaultValue={inputData?.time} />
          </p>
        </div>
        <p className="control">
          <label htmlFor="location">Location</label>
          <input
            required
            maxLength={200}
            id="location"
            name="location"
            placeholder="Venue, city or online meeting"
            defaultValue={inputData?.location}
          />
        </p>
      </fieldset>
      <div className="form-actions">{children}</div>
    </form>
  );
}
