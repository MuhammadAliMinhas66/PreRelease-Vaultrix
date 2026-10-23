import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { initialsFromName } from '../../utils/avatar.js';

function PhotoPicker({ name, displaySrc, file, error, uploading, onSelect, onClear, t }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const hasImage = Boolean(displaySrc);

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) onSelect(dropped);
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center rounded-2xl border-2 border-dashed px-5 py-8 text-center transition ${
        dragging ? 'border-ink bg-surface' : error ? 'border-red-300 bg-red-50/40' : 'border-border bg-white'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          const selected = event.target.files?.[0];
          event.target.value = '';
          if (selected) onSelect(selected);
        }}
      />

      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label={hasImage ? t('onboarding.photoChange') : t('onboarding.photoChoose')}
        className="group relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-surface ring-4 ring-white outline outline-1 outline-border transition hover:outline-ink/40"
      >
        {hasImage ? (
          <img src={displaySrc} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1.5 text-muted">
            <span className="text-2xl font-semibold text-ink/70">{initialsFromName(name) || '?'}</span>
            <Camera className="h-4 w-4" />
          </span>
        )}
        {hasImage && !uploading && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/45 group-hover:opacity-100 group-focus-visible:bg-black/45 group-focus-visible:opacity-100">
            <Camera className="h-5 w-5" />
          </span>
        )}
        {uploading && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Loader2 className="h-5 w-5 animate-spin text-ink" />
          </span>
        )}
      </motion.button>

      <p className="mt-5 text-sm text-muted">{dragging ? t('onboarding.dropHere') : t('onboarding.dropPhoto')}</p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-black/[0.03] disabled:cursor-wait disabled:opacity-70"
        >
          {uploading ? t('common.uploading') : hasImage ? t('onboarding.photoChange') : t('onboarding.photoChoose')}
        </button>
        {file && !uploading && (
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:text-ink"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t('onboarding.photoRemove')}
          </button>
        )}
      </div>

      {file && <p className="mt-3 max-w-full truncate text-xs text-ink">{file.name}</p>}
      {error ? (
        <p role="alert" className="mt-2 text-xs font-medium text-red-600">
          {error}
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted">{t('onboarding.photoHint')}</p>
      )}
    </div>
  );
}

export default PhotoPicker;
