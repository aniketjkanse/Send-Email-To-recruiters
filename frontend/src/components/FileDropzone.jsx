function FileDropzone({ id, accept, hint, file, onChange, icon = 'upload_file', placeholder = 'Click to choose a file' }) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border)] px-6 py-8 text-center transition-all hover:border-accent hover:bg-accent/5"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/10 text-accent">
        <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
          {icon}
        </span>
      </span>

      <span className="text-sm font-semibold text-[var(--text)]">
        {file ? file.name : placeholder}
      </span>
      {hint && <span className="text-xs text-[var(--muted)]">{hint}</span>}

      <input id={id} type="file" accept={accept} onChange={onChange} className="hidden" />
    </label>
  );
}

export default FileDropzone;
