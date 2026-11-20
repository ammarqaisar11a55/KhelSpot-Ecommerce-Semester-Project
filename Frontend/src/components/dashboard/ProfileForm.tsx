"use client";

import Link from "next/link";
import { useRef, useState, type DragEvent } from "react";
import ui from "@/components/ui/ui.module.css";
import { venueSports } from "@/lib/catalog/venues";
import { cx } from "@/lib/format";
import { directionsUrl, parseMapLink } from "@/lib/domain/maps";
import { SPORT_LABEL, type VenueProfile } from "@/lib/domain/types";
import { saveVenueProfile } from "@/lib/store/store";
import d from "./dashboard.module.css";
import { useOwnerVenue } from "./useOwnerVenue";

const DESCRIPTION_MAX = 300;
const PHOTO_MAX_WIDTH = 1600;
const PHOTO_MAX_HEIGHT = 1100;
const SUGGESTED_FACILITIES = [
  "Floodlights",
  "Parking",
  "Changing rooms",
  "Washrooms",
  "Drinking water",
  "Prayer area",
  "Café",
  "Seating for friends",
  "Equipment rental",
  "First aid",
];

/** Shrinks a photo in the browser so it fits in local storage and loads fast. */
async function resizePhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, PHOTO_MAX_WIDTH / bitmap.width, PHOTO_MAX_HEIGHT / bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}

type Field = "name" | "area" | "address" | "description" | "alt" | "map";

export function ProfileForm() {
  const { venue } = useOwnerVenue();
  const sports = venueSports(venue);
  const initial = (): VenueProfile => ({
    name: venue.name,
    area: venue.area,
    address: venue.address,
    description: venue.description,
    amenities: [...venue.amenities],
    courtNames: Object.fromEntries(venue.courts.map((court) => [court.id, court.name])),
    photo: venue.photo ? { src: venue.photo.src, alt: venue.photo.alt } : null,
    mapUrl: venue.mapUrl ?? "",
  });
  const [draft, setDraft] = useState<VenueProfile>(initial);
  const [savedAs, setSavedAs] = useState(() => JSON.stringify(initial()));
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [invalid, setInvalid] = useState<Set<Field>>(new Set());
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [custom, setCustom] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const dirty = JSON.stringify(draft) !== savedAs;
  const update = (patch: Partial<VenueProfile>, field?: Field) => {
    setDraft((current) => ({ ...current, ...patch }));
    setStatus(null);
    if (field)
      setInvalid((current) => {
        const next = new Set(current);
        next.delete(field);
        return next;
      });
  };

  const takePhoto = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("That file isn't a photo. Choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setPhotoError("That photo is over 15 MB. Choose a smaller one.");
      return;
    }
    try {
      const src = await resizePhoto(file);
      setPhotoError(null);
      // A new photo needs its own description; the old one would describe the wrong picture.
      update({ photo: { src, alt: "" } });
    } catch {
      setPhotoError("This browser couldn't read that photo. Try a JPG or PNG.");
    }
  };

  const onDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragging(false);
    void takePhoto(event.dataTransfer.files[0]);
  };

  const toggleFacility = (name: string) =>
    update({
      amenities: draft.amenities.includes(name)
        ? draft.amenities.filter((item) => item !== name)
        : [...draft.amenities, name],
    });

  const addCustom = () => {
    const name = custom.trim();
    if (!name) return;
    if (!draft.amenities.some((item) => item.toLowerCase() === name.toLowerCase())) {
      update({ amenities: [...draft.amenities, name] });
    }
    setCustom("");
  };

  const onSave = () => {
    const missing: Field[] = [];
    if (!draft.name.trim()) missing.push("name");
    if (!draft.area.trim()) missing.push("area");
    if (!draft.address.trim()) missing.push("address");
    if (!draft.description.trim()) missing.push("description");
    if (draft.photo && !draft.photo.alt.trim()) missing.push("alt");
    if (mapLink && "error" in mapLink) missing.push("map");
    if (missing.length) {
      setInvalid(new Set(missing));
      setStatus({ kind: "error", text: "Fill in the highlighted fields before saving." });
      return;
    }
    const clean: VenueProfile = {
      ...draft,
      mapUrl: mapLink && "url" in mapLink ? mapLink.url : "",
      name: draft.name.trim(),
      area: draft.area.trim(),
      address: draft.address.trim(),
      description: draft.description.trim(),
    };
    if (!saveVenueProfile(venue.id, clean)) {
      setStatus({ kind: "error", text: "This browser is out of room for the photo. Try a smaller one." });
      return;
    }
    setDraft(clean);
    setSavedAs(JSON.stringify(clean));
    setStatus({ kind: "ok", text: "Saved. Players now see the new profile." });
  };

  const mapLink = parseMapLink(draft.mapUrl ?? "");
  const facilities = [...SUGGESTED_FACILITIES, ...draft.amenities.filter((item) => !SUGGESTED_FACILITIES.includes(item))];

  return (
    <>
      <div className={ui.pageHead}>
        <div>
          <h1 className={ui.title}>Venue profile</h1>
          <p className={ui.subtitle}>
            What players read about you on <Link href={`/venues/${venue.slug}`}>your public page</Link> and in court search.
          </p>
        </div>
      </div>

      <div className={d.rulesLayout}>
        <div className={d.rulesMain}>
          <section className={ui.card} aria-labelledby="photo-title">
            <div className={d.cardHead}>
              <h2 id="photo-title" className={ui.cardTitle}>
                Photo
              </h2>
              <span className={ui.small}>Shown behind your name and on your search card</span>
            </div>
            <input
              ref={fileInput}
              className={d.srOnly}
              type="file"
              accept="image/*"
              aria-label="Choose a photo"
              onChange={(event) => {
                void takePhoto(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            {draft.photo ? (
              <div className={d.photoCurrent}>
                {/* eslint-disable-next-line @next/next/no-img-element -- a local preview, possibly a data URL */}
                <img src={draft.photo.src} alt="" />
                <div className={d.photoActions}>
                  <button type="button" className={ui.btnLight} onClick={() => fileInput.current?.click()}>
                    Replace photo
                  </button>
                  <button type="button" className={ui.btnLight} onClick={() => update({ photo: null })}>
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className={cx(d.dropZone, dragging && d.dropZoneOn)}
                onClick={() => fileInput.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
              >
                <strong>Add a photo of your courts</strong>
                <span>Drop it here or choose a file. A wide photo taken under the lights works best.</span>
              </button>
            )}
            {photoError && (
              <p className={ui.error} role="alert">
                {photoError}
              </p>
            )}
            {draft.photo && (
              <label className={ui.field} style={{ marginTop: 14 }}>
                <span>Describe the photo</span>
                <input
                  className={ui.input}
                  value={draft.photo.alt}
                  aria-invalid={invalid.has("alt") || undefined}
                  onChange={(event) => update({ photo: { ...draft.photo!, alt: event.target.value } }, "alt")}
                />
                <span className={ui.hint}>Read aloud to players who use a screen reader, like “Futsal pitch under floodlights”.</span>
              </label>
            )}
          </section>

          <section className={ui.card} aria-labelledby="where-title">
            <h2 id="where-title" className={ui.cardTitle}>
              Name and location
            </h2>
            <div className={d.profileFields}>
              <label className={ui.field}>
                <span>Venue name</span>
                <input
                  className={ui.input}
                  value={draft.name}
                  autoComplete="organization"
                  aria-invalid={invalid.has("name") || undefined}
                  onChange={(event) => update({ name: event.target.value }, "name")}
                />
              </label>
              <label className={ui.field}>
                <span>Area</span>
                <input
                  className={ui.input}
                  value={draft.area}
                  aria-invalid={invalid.has("area") || undefined}
                  onChange={(event) => update({ area: event.target.value }, "area")}
                />
              </label>
              <label className={`${ui.field} ${d.profileWide}`}>
                <span>Address</span>
                <input
                  className={ui.input}
                  value={draft.address}
                  autoComplete="street-address"
                  aria-invalid={invalid.has("address") || undefined}
                  onChange={(event) => update({ address: event.target.value }, "address")}
                />
                <span className={ui.hint}>Players use this to find you, so include the block or landmark.</span>
              </label>
              <label className={`${ui.field} ${d.profileWide}`}>
                <span>Google Maps link</span>
                <input
                  className={ui.input}
                  type="url"
                  inputMode="url"
                  placeholder="https://maps.app.goo.gl/…"
                  value={draft.mapUrl ?? ""}
                  aria-invalid={invalid.has("map") || undefined}
                  aria-describedby="map-help"
                  onChange={(event) => update({ mapUrl: event.target.value }, "map")}
                />
                <span id="map-help" className={mapLink && "error" in mapLink ? ui.error : ui.hint}>
                  {mapLink === null
                    ? "In Google Maps, open your venue, tap Share and copy the link. Players get directions straight to you."
                    : "error" in mapLink
                      ? mapLink.error
                      : mapLink.coords
                        ? `Pin found at ${mapLink.coords.lat.toFixed(5)}, ${mapLink.coords.lng.toFixed(5)}. Players see a map and get directions.`
                        : "Players get directions from this link. Paste a full link, with the pin's location, to also show a map."}
                </span>
                {mapLink && "url" in mapLink && (
                  <a className={d.mapTest} href={directionsUrl({ ...draft, mapUrl: mapLink.url })} target="_blank" rel="noopener noreferrer">
                    Test the directions link
                  </a>
                )}
              </label>
            </div>
          </section>

          <section className={ui.card} aria-labelledby="about-title">
            <h2 id="about-title" className={ui.cardTitle}>
              About the venue
            </h2>
            <label className={ui.field}>
              <span>Description</span>
              <textarea
                className={`${ui.input} ${d.profileText}`}
                rows={4}
                maxLength={DESCRIPTION_MAX}
                value={draft.description}
                aria-invalid={invalid.has("description") || undefined}
                aria-describedby="description-count"
                onChange={(event) => update({ description: event.target.value }, "description")}
              />
              <span id="description-count" className={ui.hint}>
                {draft.description.length} of {DESCRIPTION_MAX} characters. Say what you have and when you&apos;re open late.
              </span>
            </label>
          </section>

          <section className={ui.card} aria-labelledby="facilities-title">
            <div className={d.cardHead}>
              <h2 id="facilities-title" className={ui.cardTitle}>
                Facilities
              </h2>
              <span className={ui.small}>{draft.amenities.length} selected</span>
            </div>
            <div className={d.facilityChips}>
              {facilities.map((name) => {
                const on = draft.amenities.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={on}
                    className={cx(d.facilityChip, on && d.facilityOn)}
                    onClick={() => toggleFacility(name)}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
            <form
              className={d.customFacility}
              onSubmit={(event) => {
                event.preventDefault();
                addCustom();
              }}
            >
              <label className={ui.field}>
                <span>Something else</span>
                <input className={ui.input} value={custom} placeholder="Shower" onChange={(event) => setCustom(event.target.value)} />
              </label>
              <button type="submit" className={ui.btnLight} disabled={!custom.trim()}>
                Add
              </button>
            </form>
          </section>

          <section className={ui.card} aria-labelledby="courts-title">
            <div className={d.cardHead}>
              <h2 id="courts-title" className={ui.cardTitle}>
                Court names
              </h2>
              <span className={ui.small}>Players pick a court by these names</span>
            </div>
            <div className={d.courtNames}>
              {venue.courts.map((court) => (
                <label key={court.id} className={ui.field}>
                  <span>{SPORT_LABEL[court.sport]}</span>
                  <input
                    className={ui.input}
                    value={draft.courtNames[court.id] ?? ""}
                    placeholder={court.name}
                    onChange={(event) => update({ courtNames: { ...draft.courtNames, [court.id]: event.target.value } })}
                  />
                </label>
              ))}
            </div>
            <p className={ui.hint} style={{ marginTop: 10 }}>
              To add or remove a court, or change its sport, contact KhelSpot support. Existing bookings stay on their court.
            </p>
          </section>

          <div className={d.saveBar}>
            <button type="button" className="btn btn--accent" onClick={onSave}>
              Save changes
            </button>
            <button
              type="button"
              className={ui.btnLight}
              disabled={!dirty}
              onClick={() => {
                setDraft(JSON.parse(savedAs) as VenueProfile);
                setInvalid(new Set());
                setStatus(null);
                setPhotoError(null);
              }}
            >
              Discard changes
            </button>
            <span
              className={status?.kind === "error" ? ui.error : dirty ? d.unsaved : d.ok}
              role="status"
            >
              {status?.text ?? (dirty ? "Unsaved changes" : "")}
            </span>
          </div>
        </div>

        <aside className={d.rulesAside} aria-label="Preview of your public page">
          <section className={d.profilePreview}>
            <p className={d.previewLabel}>On your public page</p>
            <div className={d.previewHero}>
              {draft.photo && (
                // eslint-disable-next-line @next/next/no-img-element -- a live preview of an unsaved photo
                <img className={d.previewPhoto} src={draft.photo.src} alt="" />
              )}
              <div className={d.previewGlass} aria-hidden="true" />
              <div className={d.previewText}>
                <span className={d.previewCrumb}>Courts / {draft.area || "Area"}</span>
                <strong className={d.previewName}>{draft.name || "Venue name"}</strong>
                <span className={d.previewAddress}>{draft.address || "Address"}</span>
                <span className={d.previewTags}>
                  {sports.map((sport) => (
                    <span key={sport}>{SPORT_LABEL[sport]}</span>
                  ))}
                  <span>
                    {venue.courts.length} {venue.courts.length === 1 ? "court" : "courts"}
                  </span>
                </span>
              </div>
            </div>
            <div className={d.previewBody}>
              <h3>Location</h3>
              <p>
                {mapLink && "url" in mapLink
                  ? mapLink.coords
                    ? "Map with your pin, and a Get directions button."
                    : "A Get directions button that opens your link."
                  : "A Get directions button that searches Google Maps for your address."}
              </p>
              <h3>About this venue</h3>
              <p>{draft.description || "Your description shows here."}</p>
              <h3>Facilities</h3>
              {draft.amenities.length ? (
                <ul>
                  {draft.amenities.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p>None listed yet.</p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
