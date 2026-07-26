import { useState, useRef, useCallback } from 'react'

/* ─────────────────────────────────────────────
   CONFIG  ← put your Cloudinary details here
───────────────────────────────────────────── */
const CLOUD_NAME  = 'YOUR_CLOUD_NAME'   // e.g. 'dxyz123abc'
const UPLOAD_PRESET = 'YOUR_UPLOAD_PRESET' // unsigned preset name

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function fmtBytes(b) {
  if (!b) return ''
  if (b < 1024) return b + ' B'
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  return (b / (1024 * 1024)).toFixed(1) + ' MB'
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

/* ─────────────────────────────────────────────
   CREATE FOLDER MODAL
───────────────────────────────────────────── */
function CreateFolderModal({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [err, setErr]   = useState('')

  const submit = () => {
    const t = name.trim()
    if (!t)       { setErr('Folder name is required'); return }
    if (t.length < 2) { setErr('Must be at least 2 characters'); return }
    onCreate(t)
    onClose()
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <span className="modal-title">📁 New Folder</span>
          <button id="close-folder-modal" className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="field">
          <label className="label">Folder name</label>
          <div className="input-wrap">
            <span className="input-ic">📁</span>
            <input
              id="folder-name-input"
              autoFocus
              className={`input${err ? ' error' : ''}`}
              placeholder="e.g. Vacation 2025"
              value={name}
              onChange={e => { setName(e.target.value); setErr('') }}
              onKeyDown={e => e.key === 'Enter' && submit()}
            />
          </div>
          {err && <span className="field-error">⚡ {err}</span>}
        </div>

        <div className="modal-foot">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button id="create-folder-btn" className="btn btn-grad" onClick={submit}>
            Create Folder
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   UPLOAD MODAL  (real Cloudinary upload)
───────────────────────────────────────────── */
function UploadModal({ onClose, folders, activeFolderId, onUploaded }) {
  const [drag, setDrag]             = useState(false)
  const [file, setFile]             = useState(null)
  const [preview, setPreview]       = useState(null)
  const [title, setTitle]           = useState('')
  const [folderId, setFolderId]     = useState(activeFolderId ?? '')
  const [uploading, setUploading]   = useState(false)
  const [progress, setProgress]     = useState(0)
  const [error, setError]           = useState('')
  const [done, setDone]             = useState(false)
  const fileRef = useRef()

  const pickFile = f => {
    if (!f || !f.type.startsWith('image/')) { setError('Please select an image file'); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setTitle(f.name.replace(/\.[^.]+$/, ''))
    setError('')
  }

  const handleDrop = e => {
    e.preventDefault(); setDrag(false)
    pickFile(e.dataTransfer.files[0])
  }

  const handleUpload = async () => {
    if (!file) { setError('Please select an image first'); return }

    if (CLOUD_NAME === 'YOUR_CLOUD_NAME') {
      // DEMO MODE — no real upload
      setDone(true)
      const fakeImg = {
        id: uid(),
        url: preview,
        publicId: 'demo/' + uid(),
        title: title || file.name,
        size: file.size,
        folderId: folderId ? Number(folderId) : null,
      }
      onUploaded(fakeImg)
      setTimeout(onClose, 800)
      return
    }

    // ── REAL Cloudinary upload ──
    setUploading(true); setError('')
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', UPLOAD_PRESET)
    if (title) formData.append('public_id', title.replace(/\s+/g, '_'))

    const xhr = new XMLHttpRequest()
    xhr.upload.addEventListener('progress', e => {
      if (e.lengthComputable) setProgress(Math.round(e.loaded / e.total * 100))
    })

    xhr.onload = () => {
      setUploading(false)
      if (xhr.status === 200) {
        const res = JSON.parse(xhr.responseText)
        const newImg = {
          id: uid(),
          url: res.secure_url,
          publicId: res.public_id,
          title: title || res.original_filename || 'Image',
          size: res.bytes,
          folderId: folderId ? Number(folderId) : null,
        }
        setDone(true)
        onUploaded(newImg)
        setTimeout(onClose, 800)
      } else {
        setError('Upload failed. Check your Cloudinary config.')
      }
    }
    xhr.onerror = () => { setUploading(false); setError('Network error during upload.') }

    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`)
    xhr.send(formData)
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && !uploading && onClose()}>
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-head">
          <span className="modal-title">⬆️ Upload Image</span>
          <button id="close-upload-modal" className="modal-close" onClick={onClose} disabled={uploading}>✕</button>
        </div>

        {error && <div className="alert alert-err">⚠️ {error}</div>}
        {done  && <div className="alert alert-ok">✅ Uploaded successfully!</div>}

        {/* Drop zone / preview */}
        {preview ? (
          <div className="upload-preview">
            <img src={preview} alt="preview" />
            <button className="preview-remove" onClick={() => { setPreview(null); setFile(null) }}>✕</button>
          </div>
        ) : (
          <label htmlFor="file-input" style={{ cursor: 'pointer' }}>
            <div
              className={`drop-zone${drag ? ' drag' : ''}`}
              onDragOver={e => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={handleDrop}
            >
              <span className="drop-ic">🖼️</span>
              <span className="drop-text">Drag & drop an image</span>
              <span className="drop-sub">or click to browse</span>
            </div>
            <input
              id="file-input" ref={fileRef}
              type="file" accept="image/*"
              style={{ display: 'none' }}
              onChange={e => pickFile(e.target.files[0])}
            />
          </label>
        )}

        <p className="upload-hint">JPG · PNG · GIF · WebP · up to 10 MB</p>

        <div className="cloud-badge">
          ☁️ Powered by Cloudinary
          {CLOUD_NAME === 'YOUR_CLOUD_NAME' && (
            <span style={{ color: '#fbbf24', marginLeft: 6 }}>⚠️ Demo mode — add your Cloud Name to upload for real</span>
          )}
        </div>

        {/* Progress */}
        {uploading && (
          <div className="upload-progress-bar" style={{ marginTop: 14 }}>
            <div className="upload-progress-fill" style={{ width: progress + '%' }} />
          </div>
        )}

        {/* Title */}
        <div className="field" style={{ marginTop: 16 }}>
          <label className="label">Image title</label>
          <div className="input-wrap">
            <span className="input-ic">✏️</span>
            <input
              id="img-title-input"
              className="input"
              placeholder="Optional title"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>
        </div>

        {/* Folder selector */}
        <div className="field">
          <label className="label">Save to folder</label>
          <div className="input-wrap">
            <span className="input-ic">📁</span>
            <select
              id="img-folder-select"
              className="input"
              value={folderId}
              onChange={e => setFolderId(e.target.value)}
            >
              <option value="">📂 No folder (root)</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn btn-outline" onClick={onClose} disabled={uploading}>Cancel</button>
          <button
            id="upload-submit-btn"
            className="btn btn-grad"
            onClick={handleUpload}
            disabled={uploading || done || !file}
          >
            {uploading
              ? <><span className="spin" /> {progress}%</>
              : done ? '✅ Done' : '⬆️ Upload'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   LIGHTBOX
───────────────────────────────────────────── */
function Lightbox({ image, onClose }) {
  return (
    <div className="lightbox" onClick={e => e.target === e.currentTarget && onClose()}>
      <button className="lightbox-close" onClick={onClose}>✕</button>
      <img
        src={image.url}
        alt={image.title}
        className="lightbox-img"
      />
      {image.title && <div className="lightbox-caption">{image.title}</div>}
    </div>
  )
}

/* ─────────────────────────────────────────────
   MAIN GALLERY PAGE
───────────────────────────────────────────── */
const INIT_FOLDERS = [
  { id: 1, name: 'Nature',    color: '🌿' },
  { id: 2, name: 'Travel',    color: '✈️' },
  { id: 3, name: 'Family',    color: '👨‍👩‍👧' },
]

const INIT_IMAGES = [
  { id: 'i1', url: 'https://picsum.photos/seed/px1/600/450', title: 'Golden Sunset',    folderId: 1, size: 245000 },
  { id: 'i2', url: 'https://picsum.photos/seed/px2/600/450', title: 'Mountain River',   folderId: 1, size: 312000 },
  { id: 'i3', url: 'https://picsum.photos/seed/px3/600/450', title: 'City at Night',    folderId: 2, size: 198000 },
  { id: 'i4', url: 'https://picsum.photos/seed/px4/600/450', title: 'Coastal View',     folderId: 2, size: 278000 },
  { id: 'i5', url: 'https://picsum.photos/seed/px5/600/450', title: 'Cherry Blossoms',  folderId: 3, size: 221000 },
  { id: 'i6', url: 'https://picsum.photos/seed/px6/600/450', title: 'Forest Trail',     folderId: null, size: 189000 },
  { id: 'i7', url: 'https://picsum.photos/seed/px7/600/450', title: 'Desert Dunes',     folderId: null, size: 302000 },
  { id: 'i8', url: 'https://picsum.photos/seed/px8/600/450', title: 'Winter Lake',      folderId: null, size: 261000 },
]

export default function GalleryPage() {
  const [folders, setFolders]         = useState(INIT_FOLDERS)
  const [images,  setImages]          = useState(INIT_IMAGES)
  const [activeFolder, setActiveFolder] = useState(null)  // null = All Photos
  const [search, setSearch]           = useState('')
  const [showCreateFolder, setShowCF] = useState(false)
  const [showUpload, setShowUp]       = useState(false)
  const [lightbox, setLightbox]       = useState(null)

  /* derived */
  const visibleImages = images.filter(img => {
    const folderMatch = activeFolder === null ? true : img.folderId === activeFolder
    const searchMatch = !search || img.title.toLowerCase().includes(search.toLowerCase())
    return folderMatch && searchMatch
  })

  const folderName = activeFolder === null
    ? 'All Photos'
    : folders.find(f => f.id === activeFolder)?.name ?? 'Folder'

  const imagesInFolder = fid => images.filter(i => i.folderId === fid).length

  /* actions */
  const createFolder = name => {
    setFolders(fs => [...fs, { id: Date.now(), name, color: '📁' }])
  }

  const deleteFolder = (e, fid) => {
    e.stopPropagation()
    if (!window.confirm('Delete this folder? Images inside will move to root.')) return
    setFolders(fs => fs.filter(f => f.id !== fid))
    setImages(imgs => imgs.map(i => i.folderId === fid ? { ...i, folderId: null } : i))
    if (activeFolder === fid) setActiveFolder(null)
  }

  const onUploaded = useCallback(img => {
    setImages(imgs => [img, ...imgs])
  }, [])

  const deleteImage = (e, id) => {
    e.stopPropagation()
    if (!window.confirm('Delete this image?')) return
    setImages(imgs => imgs.filter(i => i.id !== id))
  }

  const totalSize = images.reduce((s, i) => s + (i.size || 0), 0)

  return (
    <div className="layout">

      {/* ══ SIDEBAR ══ */}
      <aside className="sidebar">
        <div className="sidebar-head">
          <div className="brand">
            <div className="brand-icon">🖼️</div>
            <span className="brand-name">Pixora</span>
          </div>
          <div className="sidebar-stats">
            <div className="s-stat">
              <div className="s-stat-val">{images.length}</div>
              <div className="s-stat-lbl">Photos</div>
            </div>
            <div className="s-stat">
              <div className="s-stat-val">{folders.length}</div>
              <div className="s-stat-lbl">Folders</div>
            </div>
          </div>
        </div>

        <div className="sidebar-body">
          <div className="sb-section">Library</div>

          <button
            id="nav-all"
            className={`sb-nav-btn${activeFolder === null ? ' active' : ''}`}
            onClick={() => setActiveFolder(null)}
          >
            <span className="nav-ic">🖼️</span>
            All Photos
            <span className="nav-badge">{images.length}</span>
          </button>

          <button className="sb-nav-btn" onClick={() => setShowUp(true)}>
            <span className="nav-ic">⬆️</span>
            Upload Image
          </button>

          <div className="sb-section" style={{ marginTop: 18 }}>Folders</div>

          {folders.map(f => (
            <button
              key={f.id}
              id={`nav-folder-${f.id}`}
              className={`folder-btn${activeFolder === f.id ? ' active' : ''}`}
              onClick={() => setActiveFolder(f.id)}
            >
              <span>📁</span>
              <span className="folder-btn-name">{f.name}</span>
              <span className="folder-btn-count">{imagesInFolder(f.id)}</span>
              <span
                role="button"
                tabIndex={0}
                className="folder-del"
                title="Delete folder"
                onClick={e => deleteFolder(e, f.id)}
                onKeyDown={e => e.key === 'Enter' && deleteFolder(e, f.id)}
              >✕</span>
            </button>
          ))}

          <button
            id="sidebar-new-folder"
            className="add-folder-btn"
            onClick={() => setShowCF(true)}
          >
            ➕ New Folder
          </button>
        </div>
      </aside>

      {/* ══ MAIN ══ */}
      <main className="main">

        {/* Topbar */}
        <div className="topbar">
          <div className="breadcrumb">
            <span className="bc-home" onClick={() => setActiveFolder(null)}>Gallery</span>
            {activeFolder !== null && (
              <>
                <span className="bc-sep">›</span>
                <span className="bc-cur">{folderName}</span>
              </>
            )}
          </div>

          <div className="topbar-actions">
            <div className="search">
              <span className="search-ic">🔍</span>
              <input
                id="search-input"
                placeholder="Search images…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <button
              id="topbar-new-folder"
              className="btn btn-outline"
              onClick={() => setShowCF(true)}
            >
              📁 New Folder
            </button>

            <button
              id="topbar-upload"
              className="btn btn-grad"
              onClick={() => setShowUp(true)}
            >
              ⬆️ Upload
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="content">

          {/* Stats (root only) */}
          {activeFolder === null && (
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-ic ic-purple">🖼️</div>
                <div>
                  <div className="stat-lbl">Total Images</div>
                  <div className="stat-val">{images.length}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-ic ic-pink">📁</div>
                <div>
                  <div className="stat-lbl">Folders</div>
                  <div className="stat-val">{folders.length}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-ic ic-green">☁️</div>
                <div>
                  <div className="stat-lbl">Total Size</div>
                  <div className="stat-val">{fmtBytes(totalSize)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Folders section (root only) */}
          {activeFolder === null && (
            <>
              <div className="sec-head">
                <div className="sec-title">
                  📁 Folders <span className="sec-count">{folders.length}</span>
                </div>
              </div>
              <div className="folder-grid">
                {folders.map(f => (
                  <div
                    key={f.id}
                    id={`folder-card-${f.id}`}
                    className="folder-card"
                    onClick={() => setActiveFolder(f.id)}
                  >
                    <span
                      role="button"
                      tabIndex={0}
                      className="fc-del"
                      title="Delete folder"
                      onClick={e => deleteFolder(e, f.id)}
                      onKeyDown={e => e.key === 'Enter' && deleteFolder(e, f.id)}
                    >✕</span>
                    <span className="fc-icon">📁</span>
                    <div className="fc-name">{f.name}</div>
                    <div className="fc-meta">{imagesInFolder(f.id)} images</div>
                  </div>
                ))}
                <div
                  id="add-folder-card"
                  className="folder-card folder-add-card"
                  onClick={() => setShowCF(true)}
                >
                  <span className="folder-add-ic">➕</span>
                  <span>New Folder</span>
                </div>
              </div>
            </>
          )}

          {/* Images */}
          <div className="sec-head">
            <div className="sec-title">
              🖼️ {folderName}
              <span className="sec-count">{visibleImages.length}</span>
            </div>
            <button
              id="upload-in-section"
              className="btn btn-grad"
              style={{ fontSize: 12, padding: '7px 13px' }}
              onClick={() => setShowUp(true)}
            >
              ⬆️ Add Images
            </button>
          </div>

          {visibleImages.length === 0 ? (
            <div className="empty">
              <div className="empty-ic">🗃️</div>
              <div className="empty-title">
                {search ? 'No images match your search' : 'No images here yet'}
              </div>
              <div className="empty-sub">
                {search ? 'Try a different term' : 'Upload your first image to get started'}
              </div>
              {!search && (
                <button
                  className="btn btn-grad"
                  style={{ marginTop: 10 }}
                  onClick={() => setShowUp(true)}
                >
                  ⬆️ Upload Image
                </button>
              )}
            </div>
          ) : (
            <div className="img-grid">
              {visibleImages.map(img => (
                <div
                  key={img.id}
                  id={`img-card-${img.id}`}
                  className="img-card"
                >
                  <img
                    src={img.url}
                    alt={img.title}
                    className="img-thumb"
                    loading="lazy"
                    onClick={() => setLightbox(img)}
                  />
                  <div className="img-overlay" onClick={() => setLightbox(img)}>
                    <span className="img-overlay-name">{img.title}</span>
                  </div>
                  <div className="img-actions">
                    <button
                      id={`view-${img.id}`}
                      className="img-act-btn"
                      title="View"
                      onClick={() => setLightbox(img)}
                    >🔍</button>
                    <button
                      id={`del-${img.id}`}
                      className="img-act-btn del"
                      title="Delete"
                      onClick={e => deleteImage(e, img.id)}
                    >🗑️</button>
                  </div>
                  <div className="img-footer">
                    <span className="img-title">{img.title}</span>
                    <span className="img-size">{fmtBytes(img.size)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ══ MODALS ══ */}
      {showCreateFolder && (
        <CreateFolderModal
          onClose={() => setShowCF(false)}
          onCreate={createFolder}
        />
      )}

      {showUpload && (
        <UploadModal
          onClose={() => setShowUp(false)}
          folders={folders}
          activeFolderId={activeFolder}
          onUploaded={onUploaded}
        />
      )}

      {lightbox && (
        <Lightbox image={lightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  )
}
