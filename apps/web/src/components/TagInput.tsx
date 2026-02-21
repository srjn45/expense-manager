import { useQuery } from '@tanstack/react-query'
import { useRef, useState, useCallback, useEffect } from 'react'
import { api } from '@/api/client'

const TAG_SUGGESTIONS_QUERY_KEY = 'tag-suggestions'

function useTagSuggestions(q: string) {
  return useQuery({
    queryKey: [TAG_SUGGESTIONS_QUERY_KEY, q],
    queryFn: async (): Promise<string[]> => {
      const res = (await api.GET('/api/v1/tag-suggestions', {
        params: { query: q ? { q } : {} },
      })) as
        | { data: { suggestions: string[] }; error?: undefined }
        | { data?: undefined; error: { detail?: unknown } }
      if (res.error) return []
      return res.data?.suggestions ?? []
    },
    enabled: true,
  })
}

export interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  maxTags?: number
  id?: string
  'aria-label'?: string
}

export function TagInput({
  value,
  onChange,
  placeholder = 'Type and press Enter to add',
  maxTags = 50,
  id,
  'aria-label': ariaLabel,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debouncedQ = useDebounce(inputValue.trim(), 200)
  const { data: suggestions = [] } = useTagSuggestions(debouncedQ)
  const containerRef = useRef<HTMLDivElement>(null)

  const addTag = useCallback(
    (tag: string) => {
      const t = tag.trim().slice(0, 50)
      if (!t) return
      if (value.includes(t)) return
      if (value.length >= maxTags) return
      onChange([...value, t])
      setInputValue('')
      setShowSuggestions(false)
    },
    [value, onChange, maxTags]
  )

  const removeTag = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index))
    },
    [value, onChange]
  )

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredSuggestions = suggestions.filter((s) => !value.includes(s))

  return (
    <div ref={containerRef} className="relative">
      <div className="flex min-h-[38px] flex-wrap items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus-within:border-gray-900 focus-within:ring-1 focus-within:ring-gray-900">
        {value.map((tag, i) => (
          <span
            key={`${tag}-${i}`}
            className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-sm text-gray-800"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(i)}
              className="rounded hover:bg-gray-200 focus:outline-none"
              aria-label={`Remove ${tag}`}
            >
              <span aria-hidden>×</span>
            </button>
          </span>
        ))}
        <input
          id={id}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setShowSuggestions(true)
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              addTag(inputValue)
            }
          }}
          placeholder={value.length === 0 ? placeholder : ''}
          className="min-w-[120px] flex-1 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-gray-400"
          aria-label={ariaLabel}
        />
      </div>
      {showSuggestions && filteredSuggestions.length > 0 && (
        <ul
          className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
          role="listbox"
        >
          {filteredSuggestions.slice(0, 20).map((s) => (
            <li key={s} role="option" aria-selected="false">
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                onClick={() => addTag(s)}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debouncedValue
}
