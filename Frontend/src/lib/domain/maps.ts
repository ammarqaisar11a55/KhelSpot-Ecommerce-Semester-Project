// Google Maps links for a venue's location. Links follow Google's documented
// Maps URLs (https://developers.google.com/maps/documentation/urls), which
// need no API key.

import type { Venue } from "./types";

export interface Coordinates {
  lat: number;
  lng: number;
}

export type MapLink = { url: string; coords?: Coordinates } | { error: string };

const PAIR = /(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/;

function toCoordinates(lat: string, lng: string): Coordinates | undefined {
  const point = { lat: Number(lat), lng: Number(lng) };
  const valid = Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180 && !(point.lat === 0 && point.lng === 0);
  return valid ? point : undefined;
}

function isGoogleMaps(url: URL): boolean {
  const host = url.hostname.replace(/^www\./, "");
  if (host === "maps.app.goo.gl" || host === "maps.google.com") return true;
  if (host === "goo.gl") return url.pathname.startsWith("/maps");
  return /^google\.[a-z.]+$/.test(host) && url.pathname.startsWith("/maps");
}

/** The pin in a full Google Maps link: the place's own point first, then the map view. */
function pinOf(url: URL): Coordinates | undefined {
  const href = decodeURIComponent(url.href);
  const place = href.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (place) return toCoordinates(place[1], place[2]);
  for (const key of ["q", "query", "destination", "ll"]) {
    const pair = url.searchParams.get(key)?.match(new RegExp(`^${PAIR.source}$`));
    if (pair) return toCoordinates(pair[1], pair[2]);
  }
  const view = href.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  return view ? toCoordinates(view[1], view[2]) : undefined;
}

/** Reads what an owner pasted: a Google Maps link, or plain coordinates. */
export function parseMapLink(input: string): MapLink | null {
  const text = input.trim();
  if (!text) return null;

  const bare = text.match(new RegExp(`^${PAIR.source}$`));
  if (bare) {
    const coords = toCoordinates(bare[1], bare[2]);
    if (!coords) return { error: "Those coordinates aren't on the map. Copy them again from Google Maps." };
    return { url: `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`, coords };
  }

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return { error: "Paste the link from Google Maps, or the pin's coordinates like 31.4697, 74.2728." };
  }
  if (!isGoogleMaps(url)) {
    return { error: "That isn't a Google Maps link. In Google Maps, open your venue, tap Share and copy the link." };
  }
  url.protocol = "https:";
  return { url: url.href, coords: pinOf(url) };
}

/** Where players go for directions: the owner's pin, their link, or a search for the address. */
export function directionsUrl(venue: Pick<Venue, "name" | "address" | "mapUrl">): string {
  const link = venue.mapUrl ? parseMapLink(venue.mapUrl) : null;
  if (link && "url" in link) {
    return link.coords
      ? `https://www.google.com/maps/dir/?api=1&destination=${link.coords.lat},${link.coords.lng}`
      : link.url;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.name}, ${venue.address}`)}`;
}

/** A map to show on the page, when the owner's link says exactly where the venue is. */
export function embedUrl(venue: Pick<Venue, "mapUrl">): string | null {
  const link = venue.mapUrl ? parseMapLink(venue.mapUrl) : null;
  if (!link || !("url" in link) || !link.coords) return null;
  // Google's keyless embed page, addressed directly: the older maps.google.com
  // address redirects here through a response that forbids framing.
  return `https://www.google.com/maps/embed?origin=mfe&pb=!1m3!2m1!1s${link.coords.lat},${link.coords.lng}!6i16`;
}
