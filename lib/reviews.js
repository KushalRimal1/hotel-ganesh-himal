const { escapeHtml } = require('./content');

function reviewCard(review) {
  const initials = review.name.trim().split(/\s+/).slice(0, 2).map(word => Array.from(word)[0]).join('').toUpperCase();
  const date = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Kathmandu', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(review.createdAt));
  const topic = { 'Hotel stay': 'Hotel stay', Website: 'Website experience', Suggestion: 'Visitor suggestion' }[review.topic];
  const message = escapeHtml(review.message);
  const content = review.message.length > 280
    ? `<details class="visitor-review-details"><summary><span>${escapeHtml(Array.from(review.message).slice(0, 240).join(''))}…</span><b>Read full feedback <i aria-hidden="true">+</i></b></summary><blockquote>${message}</blockquote></details>`
    : `<blockquote>${message}</blockquote>`;
  return `<article class="visitor-review-card"><div class="visitor-review-top"><span class="visitor-review-avatar" aria-hidden="true">${escapeHtml(initials)}</span><div><h3>${escapeHtml(review.name)}</h3><span class="visitor-review-topic">${topic}</span></div></div><div class="visitor-review-stars" aria-label="${review.rating} out of 5 stars"><span aria-hidden="true">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span><small>${review.rating}/5</small></div>${review.edited ? '<p class="review-edited-note">Displayed text edited by the hotel team.</p>' : ''}${content}<footer><span>Visitor-submitted · Shared with permission</span><time datetime="${escapeHtml(review.createdAt)}">${date}</time></footer></article>`;
}

function guestReviewsMarkup({ reviews, totalCount }) {
  return `<section class="guest-reviews section" id="guest-reviews" aria-labelledby="guest-reviews-title"><div class="section-heading"><div><p class="eyebrow">Voices from our visitors</p><h2 id="guest-reviews-title">Your stories.<br><em>Our mountain welcome.</em></h2></div><div class="guest-reviews-intro"><p>Visitor experiences shared with permission. Stay stories, website feedback, and ideas for a warmer welcome. Edited display text is clearly labelled.</p>${totalCount ? `<span class="guest-review-count">${totalCount} visitor ${totalCount === 1 ? 'review' : 'reviews'} · Shared with permission</span>` : ''}</div></div>${reviews.length ? `<div class="visitor-review-grid">${reviews.map(reviewCard).join('')}</div><a class="text-link" href="/contact#feedback">Share your own experience <span>↗</span></a>` : `<div class="guest-review-empty"><span class="guest-review-empty-icon" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M39 23a15 15 0 0 1-15 15c-3 0-6-1-8-2L7 40l3-10a15 15 0 1 1 29-7Z"/><path d="M17 20h14M17 26h9"/></svg></span><div><p class="eyebrow">Every journey has a story</p><h3>Be the first to share yours.</h3><p>Stayed with us or explored our website? Tell us what stood out, and help shape the next welcome.</p></div><a class="button button-dark" href="/contact#feedback">Write a visitor review <span>↗</span></a></div>`}</section>`;
}

module.exports = { guestReviewsMarkup };
