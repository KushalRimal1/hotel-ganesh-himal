'use client';

import { useEffect, useState } from 'react';
import WebsiteManager from './WebsiteManager';
import BookingManager from './BookingManager';

async function api(path, options = {}) {
  const response = await fetch(path, { cache: 'no-store', ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error || 'Something went wrong.'), { status: response.status });
  return data;
}

export default function ReviewManager() {
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [reviews, setReviews] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [activeTab, setActiveTab] = useState('reviews');
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [unsavedAvailability, setUnsavedAvailability] = useState(false);
  const selected = reviews.find(review => review.id === selectedId);

  async function refresh() {
    try {
      const data = await api('/api/admin/reviews');
      setReviews(data.reviews);
    } catch (error) {
      if (error.status === 401) { setAuthenticated(false); setReviews([]); setSelectedId(null); }
      throw error;
    }
  }
  useEffect(() => {
    let active = true;
    api('/api/admin/session').then(async session => {
      if (!active) return;
      setConfigured(session.configured); setAuthenticated(session.authenticated);
      if (session.authenticated) await refresh();
    }).catch(error => { if (active) setStatus(error.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function signIn(event) {
    event.preventDefault(); setBusy(true); setStatus('');
    try {
      await api('/api/admin/session', { method: 'POST', body: JSON.stringify({ password }) });
      setPassword(''); setAuthenticated(true); await refresh();
    } catch (error) { setStatus(error.message); }
    finally { setBusy(false); }
  }
  async function signOut() {
    if ((unsavedChanges || unsavedAvailability) && !window.confirm('Sign out and discard unsaved website changes?')) return;
    setBusy(true);
    try { await api('/api/admin/session', { method: 'DELETE' }); setAuthenticated(false); setReviews([]); setSelectedId(null); setStatus('Signed out.'); }
    catch (error) { setStatus(error.message); }
    finally { setBusy(false); }
  }
  function select(review) { setSelectedId(review.id); setDraft(review.publicMessage); setStatus(''); }
  async function update(id, changes) {
    setBusy(true); setStatus('');
    try { await api(`/api/admin/reviews/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(changes) }); await refresh(); setStatus('Review updated. The website will show the change on its next load.'); }
    catch (error) { if (error.status === 401) { setAuthenticated(false); setReviews([]); } setStatus(error.message); }
    finally { setBusy(false); }
  }
  async function remove(review) {
    if (!window.confirm(`Permanently delete feedback from ${review.name}? This removes its saved record and any public review.`)) return;
    setBusy(true); setStatus('');
    try { await api(`/api/admin/reviews/${encodeURIComponent(review.id)}`, { method: 'DELETE' }); await refresh(); if (selectedId === review.id) setSelectedId(null); setStatus('Feedback deleted.'); }
    catch (error) { setStatus(error.message); }
    finally { setBusy(false); }
  }

  const visible = reviews.filter(review => filter === 'all' || review.status === filter);
  return <main className="admin-shell">
    <header className="admin-header"><div><a href="/" className="admin-brand">Ganesh Himal <small>Hotel · Lukla</small></a><h1>Website administration</h1><p>Manage hotel content, photos, services, visitor feedback, and subscribers.</p></div><div className="admin-header-actions"><a href="/" target="_blank" rel="noreferrer">View website ↗</a>{authenticated && <button type="button" onClick={signOut} disabled={busy}>Sign out</button>}</div></header>
    {loading ? <p className="admin-status">Loading the review manager…</p> : !authenticated ? <section className="admin-login">
      <p className="eyebrow">Private hotel administration</p><h2>Sign in to manage your website.</h2><p>Use the administrator password set for this website.</p>
      {!configured && <p className="admin-alert">Administrator access needs configuring. Run <code>npm run admin:setup</code> locally, then add the generated administrator settings to your hosting environment.</p>}
      <form onSubmit={signIn}><label htmlFor="admin-password">Administrator password<input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required maxLength={512} /></label><button className="button button-dark" disabled={busy || !configured}>{busy ? 'Signing in…' : 'Sign in ↗'}</button></form>
      <details className="admin-original"><summary>Need your administrator password?</summary><p>For this local website, open <code>data/review-admin-login.txt</code> in the project folder to find the saved password. No username is needed.</p><p>To reset a forgotten password, run <code>npm run admin:setup -- --reset</code> in the project folder and restart the website server. The new password is saved in the same private file. For a hosted website, also update its administrator environment settings from <code>.env</code>.</p></details>
    </section> : <>
      <nav className="admin-tabs" aria-label="Website management">{[['bookings','Reservations'],['availability','Availability'],['reviews','Reviews & feedback'],['hotel','Hotel details'],['rooms','Rooms & prices'],['amenities','Amenities'],['gallery','Gallery & uploads'],['copy','Page content'],['settings','Website controls'],['subscribers','Subscribers']].map(([tab,label]) => <button type="button" key={tab} aria-pressed={activeTab === tab} onClick={() => setActiveTab(tab)}>{label}</button>)}</nav>
      <BookingManager activeTab={activeTab} onDirtyChange={setUnsavedAvailability} onSessionExpired={() => { setAuthenticated(false); setReviews([]); setStatus('Your session expired. Please sign in again.'); }} />
      <WebsiteManager activeTab={activeTab} onDirtyChange={setUnsavedChanges} onSessionExpired={() => { setAuthenticated(false); setReviews([]); setSelectedId(null); setStatus('Your session expired. Please sign in again.'); }} />
      <div hidden={activeTab !== 'reviews'}>
      <div className="admin-statistics">{['pending', 'published', 'hidden', 'private'].map(kind => <div key={kind}><strong>{reviews.filter(review => review.status === kind).length}</strong><span>{kind === 'private' ? 'Private feedback' : kind}</span></div>)}</div>
      <div className="admin-toolbar"><div role="group" aria-label="Filter feedback">{['all', 'pending', 'published', 'hidden', 'private'].map(kind => <button key={kind} type="button" aria-pressed={filter === kind} onClick={() => setFilter(kind)}>{kind === 'all' ? 'All feedback' : kind}</button>)}</div><button type="button" onClick={() => refresh().catch(error => setStatus(error.message))} disabled={busy}>Refresh ↻</button></div>
      <div className="admin-workspace"><section className="admin-list" aria-label="Visitor feedback">{visible.length ? visible.map(review => <article className={`admin-feedback-card ${selectedId === review.id ? 'is-selected' : ''}`} key={review.id}><div className="admin-card-heading"><h2>{review.name}</h2><span className={`admin-badge status-${review.status}`}>{review.status}</span></div><p className="admin-meta">{review.rating}/5 · {review.topic} · {new Date(review.createdAt).toLocaleDateString()}</p><p className="admin-preview">{review.publicMessage}</p><div className="admin-card-actions"><button type="button" onClick={() => select(review)}>View / edit</button>{review.status !== 'published' && <button type="button" onClick={() => update(review.id, { action: 'publish' })} disabled={busy || !review.consent} title={!review.consent ? 'Visitor publication consent is required' : ''}>Publish</button>}{review.status === 'published' && <button type="button" onClick={() => update(review.id, { action: 'hide' })} disabled={busy}>Hide</button>}<button className="admin-delete" type="button" onClick={() => remove(review)} disabled={busy}>Delete</button></div></article>) : <p className="admin-empty">No feedback in this category yet.</p>}</section>
      <aside className="admin-editor">{selected ? <>
        <p className="eyebrow">Feedback details</p><h2>{selected.name}</h2><dl><div><dt>Guest rating</dt><dd>{selected.rating}/5 — {selected.topic}</dd></div><div><dt>Private contact email</dt><dd>{selected.email}</dd></div><div><dt>Publication permission</dt><dd>{selected.consent ? 'Visitor opted in to publication' : 'Private feedback — no publication consent'}</dd></div></dl>
        <details className="admin-original" open><summary>Original visitor feedback</summary><p>{selected.message}</p></details>
        <form onSubmit={event => { event.preventDefault(); update(selected.id, { publicMessage: draft }); }}><label htmlFor="admin-public-message">Displayed review text<textarea id="admin-public-message" rows={7} value={draft} onChange={event => setDraft(event.target.value)} minLength={10} maxLength={4000} required /></label><p className="admin-help">The original feedback, name, and rating are preserved. Edited display text is labelled on the public website.</p><div className="admin-editor-buttons"><button className="button button-dark" disabled={busy}>Save displayed text</button><button type="button" onClick={() => setDraft(selected.message)} disabled={busy}>Use original text</button></div></form>
        <div className="admin-editor-buttons">{selected.consent && <button type="button" onClick={() => update(selected.id, selected.status === 'published' ? { action: 'hide' } : { action: 'publish', publicMessage: draft })} disabled={busy}>{selected.status === 'published' ? 'Hide from website' : 'Publish on website'}</button>}<button className="admin-delete" type="button" onClick={() => remove(selected)} disabled={busy}>Delete permanently</button></div>
      </> : <div className="admin-empty"><h2>Select a review.</h2><p>Open a feedback card to see its original submission and edit the public display text.</p></div>}</aside></div>
      </div>
    </>}
    <p className="admin-status" role="status" aria-live="polite">{status}</p>
    <p className="admin-storage-note">Changes are saved on the server. When hosting, keep the feedback directory on persistent storage and configure <code>HOTEL_DATA_DIR</code>.</p>
  </main>;
}
