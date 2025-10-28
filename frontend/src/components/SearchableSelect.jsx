import { useEffect, useMemo, useRef, useState } from 'react'

const match = (text, query) => {
  if (!query) return true
  try {
    return text.toLowerCase().includes(query.toLowerCase())
  } catch (_) {
    return false
  }
}

const defaultGetLabel = (option) => option?.label ?? ''
const defaultGetValue = (option) => option?.value

const SearchableSelect = ({
  options = [],
  value,
  onChange,
  placeholder = 'Select... ',
  disabled = false,
  required = false,
  className = '',
  noResultsText = 'No results',
  getLabel = defaultGetLabel,
  getValue = defaultGetValue,
  renderOption,
}) => {
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const normalized = useMemo(() => {
    return options.map((opt) => ({
      original: opt,
      label: String(getLabel(opt) ?? ''),
      value: getValue(opt),
      searchable: String(getLabel(opt) ?? ''),
    }))
  }, [options, getLabel, getValue])

  const selectedOption = useMemo(() => {
    return normalized.find((o) => o.value === value) || null
  }, [normalized, value])

  const filtered = useMemo(() => {
    if (!query) return normalized
    return normalized.filter((o) => match(o.searchable, query))
  }, [normalized, query])

  useEffect(() => {
    const onDocClick = (e) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
        setActiveIndex(0)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  const handleSelect = (opt) => {
    if (disabled) return
    onChange?.(opt.value)
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
  }

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const opt = filtered[activeIndex]
      if (opt) handleSelect(opt)
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-left bg-white disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary`}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`block truncate ${!selectedOption ? 'text-gray-400' : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
      </button>

      {/* hidden input for required validation in forms */}
      <input
        tabIndex={-1}
        className="hidden"
        value={value ?? ''}
        onChange={() => {}}
        required={required}
      />

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-2 border-b">
            <input
              ref={inputRef}
              type="text"
              placeholder="Type to search..."
              className="w-full px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActiveIndex(0)
              }}
              onKeyDown={handleKeyDown}
            />
          </div>
          <ul role="listbox" className="max-h-60 overflow-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-500">{noResultsText}</li>
            )}
            {filtered.map((opt, idx) => {
              const isActive = idx === activeIndex
              const isSelected = value === opt.value
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  className={`px-3 py-2 cursor-pointer text-sm ${isActive ? 'bg-blue-50' : ''} ${isSelected ? 'font-medium' : ''}`}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(opt)}
                >
                  {renderOption ? renderOption(opt.original) : opt.label}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

export default SearchableSelect



