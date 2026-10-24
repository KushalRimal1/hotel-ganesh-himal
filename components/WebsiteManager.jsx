'use client';

import { useEffect, useId, useState } from 'react';

async function api(path, options = {}) {
  const response = await fetch(path, { cache: 'no-store', ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error || 'Could not complete this operation.'), { status: response.status });
  return data;
}
const roomFields = ['id', 'name', 'description', 'occupancy', 'beds', 'size', 'price', 'image'];
const labels = { id: 'Room URL ID', name: 'Name', shortName: 'Short name / logo', location: 'Location', tagline: 'Tagline', description: 'Description', email: 'Hotel email', address: 'Address', checkIn: 'Check-in time', checkOut: 'Check-out time', occupancy: 'Guests', beds: 'Beds', size: 'Room style', price: 'Displayed price', image: 'Photograph', title: 'Title', text: 'Description', number: 'Step number' };
function Field({ name, value, onChange, label = labels[name] || name, multiline = false }) {
  const id = useId();
  return <div className="admin-field"><label htmlFor={id}>{label}</label>{multiline ? <textarea id={id} rows={3} value={value || ''} onChange={event => onChange(event.target.value)} maxLength={6000} /> : <input id={id} value={value || ''} onChange={event => onChange(event.target.value)} list={name === 'image' ? 'admin-image-library' : undefined} />}</div>;
}
function reorder(items, index, direction) { const next = [...items]; const target = index + direction; [next[index], next[target]] = [next[target], next[index]]; return next; }

export default function WebsiteManager({ activeTab, onSessionExpired, onDirtyChange }) {
  const [data, setData] = useState(null), [original, setOriginal] = useState(null);
  const [operations, setOperations] = useState(null), [images, setImages] = useState([]);
  const [maxUploadBytes,setMaxUploadBytes]=useState(4*1024*1024);
  const [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false), [status, setStatus] = useState('');
  const [copyGroup, setCopyGroup] = useState(''), [copySearch, setCopySearch] = useState(''), [pageKey, setPageKey] = useState('home');
  function report(error) { setStatus(error.message); if (error.status === 401) onSessionExpired(); }
  async function load() {
    const [content, ops, library] = await Promise.all([api('/api/admin/site'), api('/api/admin/operations'), api('/api/admin/media')]);
    setData(content); setOriginal(content); setOperations(ops); setImages(library.images); setMaxUploadBytes(library.maxUploadBytes||4*1024*1024); setDirty(false);
  }
  useEffect(() => { load().catch(report); }, []);
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => {
    function warn(event) { if (dirty) { event.preventDefault(); event.returnValue = ''; } }
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  function change(updater) { setData(previous => updater(previous)); setDirty(true); setStatus(''); }
  function hotel(field, value) { change(previous => ({ ...previous, hotelData: { ...previous.hotelData, hotel: { ...previous.hotelData.hotel, [field]: value } } })); }
  function list(name, value) { change(previous => ({ ...previous, hotelData: { ...previous.hotelData, [name]: value } })); }
  function item(name, index, field, value) { list(name, data.hotelData[name].map((entry, i) => i === index ? { ...entry, [field]: value } : entry)); }
  function setting(field, value) { change(previous => ({ ...previous, settings: { ...previous.settings, [field]: value } })); }
  async function save(event) {
    event.preventDefault(); setBusy(true); setStatus('');
    try {
      const { version, hotelData, copy, images: overrides, settings } = data;
      const saved = await api('/api/admin/site', { method: 'PUT', body: JSON.stringify({ version, hotelData, copy, images: overrides, settings }) });
      setData(saved); setOriginal(saved); setDirty(false); setStatus('Website saved. Public pages show these changes on their next load.');
    } catch (error) { report(error); }
    finally { setBusy(false); }
  }
  async function upload(event) {
    const file = event.target.files?.[0]; if (!file) return;
    event.target.value = '';
    if (file.size > 10 * 1024 * 1024) { setStatus('Photos must be 10 MB or smaller.'); return; }
    setBusy(true); setStatus('Uploading photograph…');
    try {
      let photo=file;
      if(file.size>maxUploadBytes){
        const bitmap=await createImageBitmap(file),canvas=document.createElement('canvas');
        try{
          const scale=Math.min(1,2000/Math.max(bitmap.width,bitmap.height));canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
          photo=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.85));
        }finally{bitmap.close();}
        if(!photo||photo.size>maxUploadBytes)throw new Error('Please choose a smaller photo. This host accepts uploads up to 4 MB after optimisation.');
      }
      const uploaded = await api('/api/admin/media', { method: 'POST', body: photo, headers: { 'Content-Type': photo.type || 'application/octet-stream' } });
      setImages(previous => [uploaded.url, ...previous]);
      change(previous => ({ ...previous, hotelData: { ...previous.hotelData, gallery: [...previous.hotelData.gallery, uploaded.url] } }));
      setStatus('Photo uploaded and added to your gallery draft. Save website changes to publish it.');
    } catch (error) { report(error); }
    finally { setBusy(false); }
  }
  async function removeSubscriber(email) {
    if (!window.confirm(`Remove ${email} from the newsletter list?`)) return;
    setBusy(true);
    try { await api('/api/admin/operations', { method: 'DELETE', body: JSON.stringify({ email }) }); setOperations(await api('/api/admin/operations')); setStatus('Subscriber removed.'); }
    catch (error) { report(error); }
    finally { setBusy(false); }
  }
  function exportSubscribers() {
    const csv = 'Email,Subscribed at\r\n' + operations.subscribers.map(record => [record.email, record.createdAt].map(value => `"${String(value || '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'hotel-newsletter-subscribers.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (!data) return <section hidden={['reviews','bookings','availability'].includes(activeTab)} className="admin-panel"><p role="status">{status || 'Loading website management…'}</p><button type="button" onClick={() => load().catch(report)}>Retry</button></section>;
  const copyFields = data.templates.flatMap(template => template.fields);
  const groups = [...new Set(copyFields.map(field => field.label))];
  const pictures = data.templates.flatMap(template => template.pictures);
  const meta = data.settings.pageMeta[pageKey] || {};
  return <section hidden={['reviews','bookings','availability'].includes(activeTab)} className="admin-site-management">
    <datalist id="admin-image-library">{images.map(image => <option value={image} key={image} />)}</datalist>
    <div className="admin-savebar"><p>{dirty ? 'You have unsaved website changes.' : 'Website content is up to date.'}</p><div><button type="button" onClick={() => { if (!dirty || window.confirm('Discard your unsaved website changes?')) { setData(original); setDirty(false); setStatus('Draft discarded.'); } }} disabled={busy || !dirty}>Discard draft</button><button type="submit" form="admin-site-form" className="button-dark" disabled={busy || !dirty}>{busy ? 'Working…' : 'Save website changes'}</button><button type="button" disabled={busy} onClick={() => { if (!dirty || window.confirm('Reload and discard unsaved website changes?')) load().catch(report); }}>Reload</button></div></div>
    <p className="admin-status" role="status" aria-live="polite">{status}</p>
    <form id="admin-site-form" onSubmit={save}>
      <fieldset disabled={busy} className="admin-form-body">
        {activeTab === 'hotel' && <section className="admin-panel"><h2>Hotel & contact details</h2><p className="admin-help">Phone and WhatsApp booking links, contact details, branding, and stay timings update together.</p><div className="admin-field-grid">{['name','shortName','location','tagline','description','email','address','checkIn','checkOut'].map(field => <Field key={field} name={field} value={data.hotelData.hotel[field]} multiline={field === 'description' || field === 'address'} onChange={value => hotel(field, value)} />)}{data.hotelData.hotel.phones.map((phone, index) => <Field key={index} name="phone" label={`Phone / WhatsApp ${index + 1}`} value={phone} onChange={value => hotel('phones', data.hotelData.hotel.phones.map((number, i) => i === index ? value : number))} />)}</div><button type="button" onClick={() => hotel('phones', data.hotelData.hotel.phones.length === 1 ? [...data.hotelData.hotel.phones, ''] : data.hotelData.hotel.phones.slice(0, 1))}>{data.hotelData.hotel.phones.length === 1 ? 'Add second phone' : 'Remove second phone'}</button></section>}
        {['rooms','amenities'].includes(activeTab) && <section className="admin-panel"><h2>{activeTab === 'rooms' ? 'Rooms & prices' : 'Amenities & dining'}</h2><p className="admin-help">Add, edit, remove, and reorder cards. Room URL IDs determine detail-page addresses.</p>{data.hotelData[activeTab].map((entry, index) => <article className="admin-content-card" key={index}><h3>{entry.name || entry.title || `Item ${index + 1}`}</h3><div className="admin-field-grid">{(activeTab === 'rooms' ? roomFields : ['icon','title','text']).map(field => field === 'icon' ? <label key={field}>Icon<select value={entry.icon} onChange={event => item(activeTab,index,'icon',event.target.value)}>{['wifi','coffee','meals','helipad','booking','shower','bag','plane','info','bed'].map(icon => <option key={icon}>{icon}</option>)}</select></label> : <Field key={field} name={field} value={entry[field]} multiline={field === 'description' || field === 'text'} onChange={value => item(activeTab,index,field,value)} />)}</div>{entry.image && <img className="admin-photo-preview" src={entry.image} alt={entry.name} />}<div className="admin-card-actions"><button type="button" disabled={index === 0} onClick={() => list(activeTab,reorder(data.hotelData[activeTab],index,-1))}>Move up</button><button type="button" disabled={index === data.hotelData[activeTab].length - 1} onClick={() => list(activeTab,reorder(data.hotelData[activeTab],index,1))}>Move down</button><button type="button" className="admin-delete" onClick={() => { if (window.confirm(`Remove ${entry.name || entry.title} from the website?`)) list(activeTab,data.hotelData[activeTab].filter((_,i) => i !== index)); }}>Remove</button>{activeTab === 'rooms' && <a href={`/rooms/${entry.id}`} target="_blank" rel="noreferrer">Preview saved room ↗</a>}</div></article>)}<button type="button" onClick={() => list(activeTab,[...data.hotelData[activeTab], activeTab === 'rooms' ? { id:'',name:'',description:'',occupancy:'2 guests',beds:'2 single beds',size:'',price:'',image:'' } : { icon:'info',title:'',text:'' }])}>Add {activeTab === 'rooms' ? 'room' : 'amenity'}</button></section>}
        {activeTab === 'gallery' && <section className="admin-panel"><h2>Gallery & photograph library</h2><label>Upload a photograph (JPEG, PNG, WebP; up to 10 MB)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} /></label><p className="admin-help">Uploads are stored on the server. Select their image paths in room, page, or gallery fields. Removing a gallery entry keeps its source photo available.</p><div className="admin-gallery-grid">{data.hotelData.gallery.map((image,index) => <article className="admin-content-card" key={index}><img className="admin-photo-preview" src={image} alt={`Gallery photo ${index + 1}`} /><Field name="image" value={image} onChange={value => list('gallery',data.hotelData.gallery.map((url,i) => i === index ? value : url))} /><div className="admin-card-actions"><button type="button" disabled={index === 0} onClick={() => list('gallery',reorder(data.hotelData.gallery,index,-1))}>Move up</button><button type="button" disabled={index === data.hotelData.gallery.length - 1} onClick={() => list('gallery',reorder(data.hotelData.gallery,index,1))}>Move down</button><button type="button" onClick={() => list('gallery',data.hotelData.gallery.filter((_,i) => i !== index))}>Remove</button></div></article>)}</div><label>Add an existing photograph<select defaultValue="" onChange={event => { if (event.target.value) list('gallery',[...data.hotelData.gallery,event.target.value]); event.target.value = ''; }}><option value="">Choose a photo…</option>{images.map(image => <option key={image}>{image}</option>)}</select></label></section>}
        {activeTab === 'copy' && <section className="admin-panel"><h2>Page text & photographs</h2><p className="admin-help">Edit story, Lukla guide, FAQs, headings, form labels, welcome text, and shared navigation/footer text. Plain text keeps the existing design and links.</p><div className="admin-field-grid"><label>Page title / search description<select value={pageKey} onChange={event => setPageKey(event.target.value)}>{Object.entries(data.pageDefaults).map(([key,page]) => <option value={key} key={key}>{page.title}</option>)}</select></label><a href={data.pageDefaults[pageKey].path} target="_blank" rel="noreferrer">View saved page ↗</a></div><div className="admin-field-grid">{['title','description','eyebrow','heading','image'].map(field => <Field key={`${pageKey}-${field}`} name={field} label={`Page ${field}${field === 'heading' ? ' (plain text)' : ''}`} multiline={field === 'description'} value={meta[field] || ''} onChange={value => setting('pageMeta',{ ...data.settings.pageMeta,[pageKey]: { ...meta,[field]:value } })} />)}</div><p className="admin-help">Blank page fields use the original title, description, heading, or photograph.</p><div className="admin-field-grid"><label>Text section<select value={copyGroup} onChange={event => setCopyGroup(event.target.value)}><option value="">All sections</option>{groups.map(group => <option key={group}>{group}</option>)}</select></label><Field name="search" label="Search original text" value={copySearch} onChange={setCopySearch} /></div>{copyFields.filter(field => (!copyGroup || field.label === copyGroup) && field.original.toLowerCase().includes(copySearch.toLowerCase())).map(field => <div className="admin-copy-field" key={field.id}><Field name="copy" label={`${field.label} · ${field.original.slice(0,80)}`} multiline value={data.copy[field.id] ?? field.original} onChange={value => change(previous => ({ ...previous,copy:{ ...previous.copy,[field.id]:value } }))} /><button type="button" onClick={() => change(previous => { const copy = { ...previous.copy }; delete copy[field.id]; return { ...previous,copy }; })}>Restore original</button></div>)}<h3>Page photographs</h3><div className="admin-field-grid">{pictures.map(picture => <Field key={picture.id} name="image" label={picture.label} value={data.images[picture.id] || picture.original} onChange={value => change(previous => ({ ...previous,images:{ ...previous.images,[picture.id]:value } }))} />)}</div></section>}
        {activeTab === 'settings' && <section className="admin-panel">
          <h2>Website controls & service status</h2><div className="admin-field-grid">{['tripadvisorUrl','mapsUrl','mapsEmbedUrl','homeHeroImage','welcomeImage'].map(field => <Field key={field} name={field.includes('Image') ? 'image' : field} label={{ tripadvisorUrl:'TripAdvisor hotel link / QR destination',mapsUrl:'Google Maps link',mapsEmbedUrl:'Google Maps embed link',homeHeroImage:'Home background photograph',welcomeImage:'Welcome photograph' }[field]} value={data.settings[field]} onChange={value => setting(field,value)} />)}</div>
          {['welcomeEnabled','newsletterEnabled','feedbackEnabled','reviewsEnabled','weatherEnabled'].map(field => <label className="admin-toggle" key={field}><input type="checkbox" checked={data.settings[field]} onChange={event => setting(field,event.target.checked)} />{{ welcomeEnabled:'Show welcome intro',newsletterEnabled:'Accept newsletter signups',feedbackEnabled:'Accept guest feedback',reviewsEnabled:'Show published website reviews',weatherEnabled:'Show Lukla weather' }[field]}</label>)}
          <p className="admin-help">TripAdvisor QR codes update with the saved link. Reviews and feedback stay saved when their public features are switched off.</p>
          {operations && <><h3>Email & storage</h3><p>Storage: {operations.status.storageProvider || 'Local JSON'} · Email: {operations.status.emailConfigured ? operations.status.emailProvider || 'Configured' : 'Not configured'}</p><p>Queued feedback emails: {operations.status.pendingEmails} · Queued reservation emails: {operations.status.pendingReservationEmails || 0}</p><p>Feedback records: {operations.status.feedbackCount} · Newsletter subscribers: {operations.status.subscriberCount}</p>{!operations.status.emailConfigured&&<p className="admin-help">On Netlify, set RESEND_API_KEY, EMAIL_FROM, and FEEDBACK_TO in private environment settings. Use a verified Resend sender. Saved records remain available while email is being configured.</p>}<button type="button" onClick={async () => { setBusy(true); try { await api('/api/admin/operations',{ method:'POST',body:JSON.stringify({ action:'retry-email' }) }); setOperations(await api('/api/admin/operations')); setStatus('Email queue checked.'); } catch(error) { report(error); } finally { setBusy(false); } }}>Retry queued hotel emails</button></>}
          <div className="admin-card-actions"><a className="text-link" href="/api/admin/operations?export=1">Download private website & guest-data backup ↓</a><a href="/tripadvisor-qr.svg?download=1">Download TripAdvisor QR ↓</a></div>
          <details className="admin-original"><summary>Administrator password & hosting configuration</summary><p>Reset your local password with <code>npm run admin:setup -- --reset</code>. The password is saved in <code>data/review-admin-login.txt</code>; copy the matching administrator hash and session secret privately into your host's environment settings.</p><p>Netlify uses durable Blobs storage automatically. Local or traditional Node hosting uses the data directory; configure <code>HOTEL_DATA_DIR</code> on a persistent disk for that hosting mode.</p></details>
        </section>}
        {activeTab === 'subscribers' && <section className="admin-panel"><h2>Newsletter subscribers</h2><button type="button" onClick={exportSubscribers} disabled={!operations?.subscribers.length}>Export subscribers as CSV ↓</button><div className="admin-subscriber-list">{operations?.subscribers.length ? operations.subscribers.map(record => <article key={record.email}><div><a href={`mailto:${record.email}`}>{record.email}</a><p>{new Date(record.createdAt).toLocaleString()}</p></div><button type="button" className="admin-delete" onClick={() => removeSubscriber(record.email)}>Remove subscriber</button></article>) : <p>No newsletter subscribers yet.</p>}</div></section>}
      </fieldset>
    </form>
  </section>;
}
