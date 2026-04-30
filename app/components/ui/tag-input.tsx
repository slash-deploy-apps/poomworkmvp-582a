import { useState, useRef } from 'react';
import { X } from 'lucide-react';
import { Badge } from './badge';
import { Input } from './input';

interface TagInputProps {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  label?: string;
  examples?: string[];
}

export function TagInput({ name = 'tags', defaultValue = '', placeholder = '태그를 입력하고 Enter를 누르세요', label = '태그', examples }: TagInputProps) {
  const [tags, setTags] = useState<string[]>(() =>
    defaultValue ? defaultValue.split(',').map(s => s.trim()).filter(Boolean) : []
  );
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setInput('');
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]!);
    }
  };

  const addExample = (tag: string) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    inputRef.current?.focus();
  };

  return (
    <div className='space-y-2'>
      {label && <label className='text-sm font-medium'>{label}</label>}
      <div className='flex flex-wrap items-center gap-2 bg-white rounded-[20px] border-0 p-3 min-h-[48px]'>
        {tags.map(tag => (
          <Badge key={tag} variant='secondary' className='flex items-center gap-1 px-2 py-1'>
            #{tag}
            <button type='button' onClick={() => removeTag(tag)} className='ml-1 hover:text-red-500'>
              <X className='h-3 w-3' />
            </button>
          </Badge>
        ))}
        <Input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ''}
          className='flex-1 min-w-[120px] border-0 bg-transparent h-8 px-1 focus-visible:ring-0 focus-visible:ring-offset-0'
        />
      </div>
      {examples && examples.length > 0 && (
        <div className='flex flex-wrap gap-2 mt-2'>
          {examples.map(ex => (
            <button
              key={ex}
              type='button'
              onClick={() => addExample(ex)}
              className='text-xs text-[#7C3AED] bg-[#EDE9FE] hover:bg-[#DDD6FE] px-2 py-1 rounded-full transition-colors'
            >
              #{ex}
            </button>
          ))}
        </div>
      )}
      <input type='hidden' name={name} value={tags.join(',')} />
    </div>
  );
}