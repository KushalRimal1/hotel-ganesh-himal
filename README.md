# Hotel Ganesh Himal Lukla

A Next.js App Router hotel website with the existing design, editable JSON content, phone/WhatsApp reservations, private guest feedback, and a newsletter form.

## GitHub source and private hosting settings

The GitHub repository contains application code, public hotel photos, `data/hotel.json`, package/lock files, tests, scripts, and the blank `.env.example` template. Real `.env` files, administrator login details, private guest records, saved dashboard content, uploads, exports, backups, and build/dependency folders are excluded. Private registration/signature scans live in the ignored `data/private-assets/` folder, outside public website assets.

Before committing future updates, stage only intended source files and run `npm run publish:check`. This checks the Git index for private paths, known local credentials, private guest email addresses, and credential signatures without printing secret values. Use `npm run publish:check -- --worktree` to check eligible local source files before staging.

For hosting, enter the SMTP and administrator values from your private local `.env` into the hosting provider's **environment variables/secrets** settings. Keep them out of GitHub source and browser code. Set `SITE_URL` to the hosted domain and `HOTEL_DATA_DIR` to a writable persistent disk. Move any existing guest records or private uploads to that disk through a private transfer, not through the public repository. Start with `npm ci`, build with `npm run build`, and run with `npm start`; the host supplies its `PORT` environment variable. Node.js 22/24 LTS is recommended.

## Run locally

Node.js 20.9 or newer is required (Node.js 22 or 24 LTS recommended).

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

For production:

```bash
npm run build
npm start
```

Use `npm start -- --port 3002` to run on another port. The compatibility command `node server.js` also starts Next.js after a production build; `node server.js --dev` starts development mode.

## Next.js structure and SEO

- `app/[[...slug]]/page.jsx` renders the ten existing page URLs through Next.js Server Components.
- `app/layout.jsx` provides the shared document, unchanged fonts/styles, and server-selected page palette.
- `views/site.html`, `views/lukla.html`, and `pages.js` preserve the existing authored markup. `html-react-parser` converts that trusted markup into React elements on the server.
- `lib/content.js` renders room cards, custom amenity icons, and gallery cards on the server. The content is present without JavaScript.
- `components/SiteScripts.jsx` loads the existing browser interactions after hydration. Links keep normal page navigation and all existing URL paths/anchors.
- `app/api/` contains Next.js route handlers for hotel data, feedback, and newsletter signups. `lib/backend.js` owns private persistence and email delivery.
- `proxy.js` sets an internal pathname header for the server-rendered body theme. Incoming values are replaced with the actual path.

Each page has a title, description, canonical URL, Open Graph/Twitter metadata, and Hotel/Breadcrumb JSON-LD. Room detail pages also include HotelRoom JSON-LD. Sample guest reviews are not included as structured ratings. `/sitemap.xml` lists all current pages, and `/robots.txt` links to it. Set `SITE_URL` to the permanent public origin when deploying; otherwise metadata uses the incoming request origin.

Pages render dynamically so updates in `data/hotel.json` appear without rebuilding. Styling, photographs, dimensions, and interactions are retained. Static image URLs still use the `public/images/` files directly.

## Website pages

- `/` — Home and an overview of the hotel
- `/rooms` — Normal, Deluxe, and Super Deluxe room options with category filters
- `/rooms/normal-room`, `/rooms/deluxe-room`, `/rooms/super-deluxe` — Individual room details and direct enquiries
- `/our-story` — Hotel introduction
- `/lukla` — The Lukla journey
- `/amenities` — Amenities and dining
- `/gallery` — Full-photo gallery
- `/contact` — Phone/WhatsApp booking, location, and private feedback

Each page has its own title, description, breadcrumb, and active navigation. Pages load directly at their URLs and use a shared header and footer. Booking and feedback anchors are `/contact#booking` and `/contact#feedback`. Room URLs use the `id` in `data/hotel.json`; room cards, room details, and stay timings use that JSON content.

The listed room rates are Normal $25 USD, Deluxe $35 USD, and Super Deluxe $50 USD, using the hotel's uploaded photos. Prices are displayed as supplied without assuming a per-night or per-person basis. The original room-detail URLs redirect to the new categories for existing links and bookmarks.

Page palettes are defined in `public/themes.css` using `body[data-page]` tokens. Home uses charcoal and amber, Our Story uses terracotta and linen, Rooms uses navy and gold, Lukla uses sky and slate, Amenities uses burgundy and peach, Gallery uses plum and lilac, and Contact uses ink blue and lavender. Shared components inherit the page palette for backgrounds, buttons, focus, selected, and hover states. Room detail pages inherit the Rooms palette.

The home-page hotel marker is anchored to normalized image coordinates in `views/site.html`. `public/hotspot.js` maps that point through the photo's actual `background-size: cover` scale and responsive background position, then updates it with `ResizeObserver`. If the airport photo is replaced, update `data-photo-src`, `data-image-x`, and `data-image-y` to match the new photo. The marker should never be positioned using viewport percentages.

The welcome intro starts after its photograph and heading fonts are ready, with a bounded loading wait, and waits until the browser tab is visible. Mobile/touch devices use a slower sequence, and Enter becomes available after its reveal animation. The intro stays visible until Enter or Skip is selected, and pauses if the tab is backgrounded. Fresh visits/reloads and restored first visits show it again. `lib/welcome-policy.js` distinguishes actual internal Home clicks/browser returns from mobile tab restoration using a short-lived navigation intent and the previous page path. Its pre-paint guard prevents internal navigation flashes without suppressing a fresh mobile opening. Explicit `?welcome=1` replay links force the intro once and are then cleaned from the address bar. Reduced-motion devices receive the full readable welcome without animated movement.

Gallery thumbnails use uniform 4:3, edge-to-edge frames; the portrait washroom preview focuses on the lower fixtures. Clicking a thumbnail still opens the complete original image.

The gallery focuses on hotel interiors rather than repeating the exterior photograph. Captions follow the image filename, so removing or reordering photos does not mismatch their names. The photo viewer has Previous/Next buttons, a photo counter, and keyboard controls (Left/Right arrows, Home, End, and Escape). Navigation wraps at either end, and controls disable when only one photo exists. The separate Lukla airport viewer keeps its own caption and does not show hotel-gallery navigation.

The home-page weather card loads `/api/weather`, which retrieves Open-Meteo's current model-based temperature for Lukla at 2,860 m. It displays Celsius, conditions, the provider update time in Nepal time, and attribution. Data is cached for up to ten minutes and the browser refreshes while the page is visible. No API key is needed. If the provider is unavailable, the card displays "Unavailable" with a retry button rather than inventing a temperature.

The weather display is compact and transparent, using a subtle text shadow for readability rather than a solid panel or backdrop blur.

## Animation system

`public/motion.js` uses IntersectionObserver and the Web Animations API for staggered scroll reveals, page entrances, room-filter transitions, FAQ reveals, and photo-dialog exits. `public/animations.css` adds native cross-document transitions in supporting browsers, subtle image zooms, button feedback, mobile-menu motion, and feedback confirmation animations. The hero airport background is never moved by this system, so the hotel marker stays aligned. Page entrances wait until the welcome intro is dismissed. Motion is reduced or disabled according to the visitor's reduced-motion setting; no-JavaScript content remains readable. The animation controller adds a thin scroll-progress indicator and performs scroll updates with requestAnimationFrame.

Dining photos use enhanced WebP copies with conservative contrast/sharpening and 2× Lanczos resizing. Original photos are preserved. To regenerate the copies, install Python Pillow and run `python scripts/enhance-photos.py`. Upscaling improves presentation but does not restore missing source detail.

## Update hotel details

Use the private dashboard to change website content and upload photos. `data/hotel.json` supplies initial defaults before the first dashboard save; after that, saved dashboard content in `site-content.json` takes precedence. You can also put photos in `public/images/` and select their paths in the dashboard.

The booking numbers are +977 9841425409 and +977 9851039770. Visitor reviews come only from feedback explicitly submitted with public-sharing consent.

## Reservations and form data

Reservations are confirmed directly by phone or WhatsApp. Both numbers appear in the direct-booking section. Room enquiries open WhatsApp with the room name included. Newsletter signups are saved to `data/subscribers.json`.

Contact uses the upper direct-WhatsApp stay planner as its only stay-enquiry form. Guests enter optional arrival/departure dates, guest count, room preference, and notes, preview or copy the message, and open WhatsApp directly. There is no separate lower reservation-request section. Room cards, room details, and the comparison table link to `/contact?room=<room-id>#booking` to preselect a room. Both hotel WhatsApp contacts use the prepared details. Guests press Send in WhatsApp and confirm arrangements directly with the hotel. Direct phone/WhatsApp links remain available without JavaScript.

### Saved reservation administration

The earlier reservation desk has been removed from the public Contact page in favour of the upper direct-WhatsApp planner. Previously saved records remain in private `reservations.json` under `HOTEL_DATA_DIR` (or local `data/`) and can be managed in the authenticated admin dashboard. The underlying reservation APIs remain available for these records and administrative workflows; the public page does not render the separate request/tracking form.

New enquiries from the public planner open WhatsApp directly and are not submitted to the website reservation API. The hotel receives their details when the guest sends the WhatsApp message.

The private dashboard has **Reservations** and **Availability** tabs. Owners can filter/search requests, set pending/confirmed/declined/cancelled status, agree price/terms, send guest-visible messages, keep private notes, export CSV, and record phone/offline requests. Confirmed records must be cancelled before permanent deletion. Version checks prevent stale saves. Record phone/offline reservations here and confirm them so their occupancy is included in capacity checks.

Availability is managed per room category: enabled/paused, actual inventory, and closed nights. Inventory **0** means manual confirmation; no room count is invented. Positive inventory prevents confirmed reservations from exceeding capacity on any overlapping night, with departure treated as exclusive. Pending requests do not hold rooms. Confirmation rechecks capacity, closures, and current room definitions. Global pause stops website submissions while status lookup remains available. Changes to inventory/closed dates cannot invalidate future confirmed stays. Pausing requests does not cancel existing stays.

Guest acknowledgements, owner alerts, confirmations, and status updates are queued durably with the reservations. The existing SMTP worker retries them every minute and after restart; the admin can retry manually. Configure `SMTP_*` and `FEEDBACK_TO` for email delivery. Without SMTP, requests are saved and status tracking works, while emails remain queued. Website acceptance alone is not a confirmed reservation. Final pricing, payment/deposit arrangements, cancellation terms, and requested services are agreed directly with the hotel.

Hotel reservation alerts are attempted before guest messages. Recipient-specific failures stay queued without blocking other recipients; connection/authentication failures stop that attempt until the next retry. Safe delivery errors are stored and shown in **Reservations → Email delivery issues**. Owner alerts use the current `FEEDBACK_TO` setting. Guest receipts/status lookups show queued, failed, or provider-accepted email status, with a refresh button; provider acceptance does not prove inbox placement. Restart the website after changing SMTP settings or backend email code.

Rooms also have a side-by-side comparison table. Booking FAQs on Rooms/Contact and the `/privacy` page are editable through the page-content admin tools. The backup download includes reservation records, availability settings, and the email queue; keep it private.

## Guest feedback and email delivery

The feedback form posts to the Next.js route `POST /api/feedback`; the backend validates the submission and saves it to private `data/feedback.json`. Private feedback is never exposed by a public API. Offline submissions display an error so guests can retry.

The optional public-review checkbox is unchecked by default. Selecting it records consent and puts new feedback into a pending moderation state. The hotel owner decides when to publish it in `/admin/reviews`. `/api/reviews` exposes only approved, consented public fields; email addresses, delivery status, and private submissions are never included. Contact shows the six latest published reviews as its final section above the footer. Existing consented public reviews retain their publication status. Guest names, original ratings, and original feedback are preserved when the public display text is edited; edited display text is labelled publicly.

The feedback email includes consent and publication status. Private submissions are never made public automatically. New public-sharing submissions are acknowledged as pending approval.

## Online review management

Open `/admin/reviews` to sign in and manage visitor feedback. The dashboard supports pending/published/hidden/private filters, editing the displayed review text, publishing consented reviews, hiding reviews, and permanent deletion. The original guest name, rating, and submission remain unchanged when display text is edited. Publication is blocked for feedback with no visitor consent.

Admin access is available only by opening `/admin` or `/admin/reviews` directly. There are no admin links in the public website. Bookmark the address privately. No username is required. The local password is in `data/review-admin-login.txt`; the sign-in page also explains password recovery. All management APIs require a signed administrator session; writes also require the same origin.

The dashboard includes hotel/contact details, rooms/prices/detail-page URLs, amenities, gallery ordering and image uploads, page text and photographs (including story and Lukla FAQs), page titles/descriptions, TripAdvisor/QR and Google Maps settings, public feature switches, review/private-feedback moderation, newsletter subscriber removal/CSV export, queued email retry/status, and a private JSON backup download. Save drafts with **Save website changes**. A version check prevents an older dashboard draft overwriting a newer save.

Website changes are stored in `site-content.json` inside `HOTEL_DATA_DIR` (or local `data/`), with `data/hotel.json` as initial defaults. Uploaded JPEG/PNG/WebP photographs are stored in an `uploads/` subfolder and served at `/media/<generated-name>`. Copy edits are plain text, preserving existing HTML and preventing script injection. Disabling feedback/newsletter also pauses their submission APIs. Hiding reviews does not delete saved feedback. The full backup contains private guest data; store it privately. SMTP settings and administrator credentials remain in server configuration. Reservations continue through phone/WhatsApp and TripAdvisor reviews through TripAdvisor.

Run `npm run admin:setup` once locally. It generates a strong password, a scrypt password hash, and a session-signing secret. The password is saved in private, git-ignored `data/review-admin-login.txt`; credentials are never exposed by public routes. To reset it, run `npm run admin:setup -- --reset` and restart the server. Administrator sessions use signed, expiring HttpOnly cookies; management writes require authentication and same-origin requests. Admin pages are excluded from indexing and cannot be embedded in another website.

### TripAdvisor QR code

The Contact page includes a TripAdvisor section at `/contact#tripadvisor`, also linked from every page footer. Its QR code encodes the hotel's full TripAdvisor URL directly, without an intermediate redirect or external QR-image service. Guests can tap **Open TripAdvisor** or scan the code. **Download QR code** saves a scalable SVG suitable for printing. The image is served at `/tripadvisor-qr.svg`; the destination is defined in `lib/tripadvisor.js`. The website dashboard manages website feedback; TripAdvisor reviews are managed on TripAdvisor.

### Hosting with durable changes

Deploy as a single long-running Next.js Node server with a **persistent disk**. Mount the disk and set `HOTEL_DATA_DIR` to its writable folder (for example `/var/data/hotel`). Copy existing `feedback.json` and `subscribers.json` there when migrating. Set `ADMIN_REVIEW_PASSWORD_HASH` and `ADMIN_SESSION_SECRET` in the hosting environment to the generated values in `.env`, together with the SMTP settings and permanent `SITE_URL`. Then the dashboard works through the hosted domain and edits survive server restarts/redeploys. No rebuild is needed after moderation changes.

The default local `data/` folder persists locally; an ephemeral deployment filesystem will not retain edits. Serverless/multiple-instance deployment needs a shared database and durable email queue rather than this single-server JSON storage. Back up the persistent data folder. Keep `review-admin-login.txt` private and outside public assets.

Photo licence information is on `/photo-credits`, linked discreetly from the footer instead of displaying a long author/licence line on every page.

Copy `.env.example` to `.env` and enter `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, and `FEEDBACK_TO` using your mail provider's settings. For Gmail use `smtp.gmail.com`, port `465`, `SMTP_SECURE=true`, and an app password. Keep passwords in `.env`, never in browser code. Restart the server after changing settings.

Email includes the guest's name, rating, topic, message, and a reply-to address. Submissions are saved before email is attempted; pending messages are retried every minute and after a restart. Without SMTP settings, feedback is stored locally and remains queued. The UI confirms saving, not email delivery. SMTP acceptance marks the record `sent`; inbox arrival depends on the mail provider.

The form accepts up to five submissions per IP per 15 minutes and includes a hidden spam field. Back up the private data folder when deploying. `HOTEL_DATA_DIR` can point to a persistent writable directory for guest records; hotel content continues to come from `data/hotel.json`. The JSON storage and background email retries are intended for a single long-running Next.js Node server. For serverless or multiple instances, use shared database storage and a durable email queue.

## Checks

```bash
npm run check
npm test
npm run build
```
