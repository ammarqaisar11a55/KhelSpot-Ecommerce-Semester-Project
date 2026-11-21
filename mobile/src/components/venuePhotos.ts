// Photos of the Lahore launch venues ship inside the app, so they show offline and
// before the website is deployed. Venues that upload their own photo later are
// loaded from the web address instead. Same stock photos and credits as Frontend/public/venues.
import baseline from "../../assets/venues/baseline-padel-club-dha.jpg";
import crease from "../../assets/venues/crease-indoor-cricket-gulberg.jpg";
import nightOwl from "../../assets/venues/night-owl-arena-johar-town.jpg";
import shuttle from "../../assets/venues/shuttle-house-model-town.jpg";

export const BUNDLED_VENUE_PHOTOS: Record<string, number> = {
  "/venues/baseline-padel-club-dha.jpg": baseline,
  "/venues/crease-indoor-cricket-gulberg.jpg": crease,
  "/venues/night-owl-arena-johar-town.jpg": nightOwl,
  "/venues/shuttle-house-model-town.jpg": shuttle,
};
