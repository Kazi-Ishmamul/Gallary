import { useState, useRef, useCallback, useEffect } from 'react'

/* ─────────────────────────────────────────────
   CONFIG
───────────────────────────────────────────── */
const API_BASE_URL = 'http://localhost:8080/api'

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function fmtBytes(b) {
  if (!b) return '0 B'
  if (b < 1024) return b + ' B'
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  return (b / (1024 * 1024)).toFixed(1) + ' MB'
}

/* ─────────────────────────────────────────────
   CREATE FOLDER MODAL
───────────────────────────────────────────── */
function CreateFolderModal({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [err, setErr]   = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const t = name.trim()
    if (!t)       { setErr('Folder name is required'); return }
    if (t.length < 2) { setErr('Must be at least 2 characters'); return }
    
    setSaving(true)
    try {
      await onCreate(t)
      onClose()
    } catch (e) {
      setErr('Failed to create folder')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <span className="modal-title">📁 New Folder</span>
          <button id="close-folder-modal" className="modal-close" onClick={onClose} disabled={saving}>✕</button>
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
              disabled={saving}
            />
          </div>
          {err && <span className="field-error">⚡ {err}</span>}
        </div>

        <div className="modal-foot">
          <button className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
          <button id="create-folder-btn" className="btn btn-grad" onClick={submit} disabled={saving}>
            {saving ? <><span className="spin" /> Creating</> : 'Create Folder'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   UPLOAD MODAL  (real Cloudinary upload + DB save)
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

    setUploading(true); setError('')
    const formData = new FormData()
    formData.append('file', file)
    if (title) formData.append('title', title)
    if (folderId) formData.append('folderId', folderId)

    const xhr = new XMLHttpRequest()
    xhr.upload.addEventListener('progress', e => {
      if (e.lengthComputable) setProgress(Math.round(e.loaded / e.total * 100))
    })

    xhr.onload = async () => {
      if (xhr.status === 200) {
        try {
          const savedImage = JSON.parse(xhr.responseText)
          setDone(true)
          onUploaded(savedImage)
          setTimeout(onClose, 800)
        } catch (dbErr) {
          setError('Failed to process server response.')
          setUploading(false)
        }
      } else {
        setError('Upload failed. Server error: ' + xhr.status)
        setUploading(false)
      }
    }
    xhr.onerror = () => { setUploading(false); setError('Network error during upload.') }

    xhr.open('POST', `${API_BASE_URL}/images/upload`)
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
            <button className="preview-remove" onClick={() => { setPreview(null); setFile(null) }} disabled={uploading}>✕</button>
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

        <p className="upload-hint">JPG · PNG · GIF · WebP · up to 20 MB</p>

        <div className="cloud-badge">
          ☁️ Powered by Cloudinary
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
              disabled={uploading}
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
              disabled={uploading}
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
export default function GalleryPage() {
  const [folders, setFolders]         = useState([])
  const [images,  setImages]          = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  
  const [activeFolder, setActiveFolder] = useState(null)  // null = All Photos
  const [search, setSearch]           = useState('')
  const [showCreateFolder, setShowCF] = useState(false)
  const [showUpload, setShowUp]       = useState(false)
  const [lightbox, setLightbox]       = useState(null)

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [foldersRes, imagesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/folders`),
          fetch(`${API_BASE_URL}/images`)
        ])
        
        if (!foldersRes.ok || !imagesRes.ok) throw new Error('Failed to fetch data')
        
        const foldersData = await foldersRes.json()
        const imagesData = await imagesRes.json()
        
        setFolders(foldersData)
        setImages(imagesData)
      } catch (err) {
        console.error(err)
        setError('Could not connect to the server. Is Spring Boot running?')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  /* derived */
  const visibleImages = images.filter(img => {
    // If the image has a folder, the ID is stored in img.folder.id, otherwise img.folder is null
    const imgFolderId = img.folder ? img.folder.id : null
    const folderMatch = activeFolder === null ? true : imgFolderId === activeFolder
    const searchMatch = !search || img.title.toLowerCase().includes(search.toLowerCase())
    return folderMatch && searchMatch
  })

  const folderName = activeFolder === null
    ? 'All Photos'
    : folders.find(f => f.id === activeFolder)?.name ?? 'Folder'

  const imagesInFolder = fid => images.filter(i => (i.folder?.id) === fid).length

  /* actions */
  const createFolder = async (name) => {
    const res = await fetch(`${API_BASE_URL}/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color: '📁' })
    })
    if (!res.ok) throw new Error('Failed')
    const newFolder = await res.json()
    setFolders(fs => [...fs, newFolder])
  }

  const deleteFolder = async (e, fid) => {
    e.stopPropagation()
    if (!window.confirm('Delete this folder? Images inside will move to root.')) return
    
    try {
      const res = await fetch(`${API_BASE_URL}/folders/${fid}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      
      setFolders(fs => fs.filter(f => f.id !== fid))
      setImages(imgs => imgs.map(i => i.folder?.id === fid ? { ...i, folder: null } : i))
      if (activeFolder === fid) setActiveFolder(null)
    } catch (err) {
      alert('Error deleting folder')
    }
  }

  const onUploaded = useCallback(img => {
    setImages(imgs => [img, ...imgs])
  }, [])

  const deleteImage = async (e, id) => {
    e.stopPropagation()
    if (!window.confirm('Delete this image from database and Cloudinary?')) return
    
    try {
      const res = await fetch(`${API_BASE_URL}/images/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      
      setImages(imgs => imgs.filter(i => i.id !== id))
    } catch (err) {
      alert('Error deleting image')
    }
  }

  const renameFolder = async (e, f) => {
    e.stopPropagation()
    const newName = window.prompt('Enter new folder name:', f.name)
    if (!newName || newName.trim() === '' || newName === f.name) return
    
    try {
      const res = await fetch(`${API_BASE_URL}/folders/${f.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() })
      })
      if (!res.ok) throw new Error('Failed to rename folder')
      
      const updatedFolder = await res.json()
      setFolders(fs => fs.map(folder => folder.id === f.id ? updatedFolder : folder))
    } catch (err) {
      alert('Error renaming folder')
    }
  }

  const renameImage = async (e, img) => {
    e.stopPropagation()
    const newTitle = window.prompt('Enter new image title:', img.title)
    if (!newTitle || newTitle.trim() === '' || newTitle === img.title) return
    
    try {
      const res = await fetch(`${API_BASE_URL}/images/${img.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() })
      })
      if (!res.ok) throw new Error('Failed to rename image')
      
      const updatedImage = await res.json()
      setImages(imgs => imgs.map(i => i.id === img.id ? updatedImage : i))
    } catch (err) {
      alert('Error renaming image')
    }
  }

  const totalSize = images.reduce((s, i) => s + (i.sizeBytes || 0), 0)

  if (loading) {
    return (
      <div className="layout" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div className="spin" style={{ width: 40, height: 40 }} />
          <div style={{ color: 'var(--text2)' }}>Loading Gallery...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="layout" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="alert alert-err" style={{ maxWidth: 400, textAlign: 'center', display: 'block' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔌</div>
          <h3 style={{ marginBottom: 8, color: '#fff' }}>Connection Error</h3>
          {error}
        </div>
      </div>
    )
  }

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
              <span
                role="button"
                tabIndex={0}
                className="folder-del"
                style={{ right: 30 }}
                title="Rename folder"
                onClick={e => renameFolder(e, f)}
                onKeyDown={e => e.key === 'Enter' && renameFolder(e, f)}
              >✏️</span>
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
                    <span
                      role="button"
                      tabIndex={0}
                      className="fc-del"
                      style={{ right: 36 }}
                      title="Rename folder"
                      onClick={e => renameFolder(e, f)}
                      onKeyDown={e => e.key === 'Enter' && renameFolder(e, f)}
                    >✏️</span>
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
                      className="img-act-btn edit"
                      title="Rename"
                      onClick={e => renameImage(e, img)}
                    >✏️</button>
                    <button
                      id={`del-${img.id}`}
                      className="img-act-btn del"
                      title="Delete"
                      onClick={e => deleteImage(e, img.id)}
                    >🗑️</button>
                  </div>
                  <div className="img-footer">
                    <span className="img-title">{img.title}</span>
                    <span className="img-size">{fmtBytes(img.sizeBytes)}</span>
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
