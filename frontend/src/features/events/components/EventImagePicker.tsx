import { EventImage } from "../event.types";
import { imageUrl } from "../api/events.api";

export default function EventImagePicker({
  images,
  selectedImage,
  onSelect,
}: {
  images: EventImage[];
  selectedImage: string;
  onSelect: (image: string) => void;
}) {
  return (
    <fieldset id="image-picker">
      <legend>
        Cover image <span className="optional">Choose one</span>
      </legend>
      <ul>
        {images.map((image) => (
          <li key={image.path}>
            <label className={selectedImage === image.path ? "selected" : undefined}>
              <input
                type="radio"
                name="image"
                value={image.path}
                required
                checked={selectedImage === image.path}
                onChange={() => onSelect(image.path)}
                aria-label={image.caption}
              />
              <img src={imageUrl(image.path)} alt={image.caption} />
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
