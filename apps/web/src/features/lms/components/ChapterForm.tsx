import React, { useState } from 'react';
import type { ChapterInput } from '../validation/schemas';

interface ChapterFormProps {
  courseId: string;
  initialData?: Partial<ChapterInput>;
  orderIndex: number;
  onSubmit: (data: ChapterInput) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function ChapterForm({
  courseId,
  initialData,
  orderIndex,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Add Chapter',
}: ChapterFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [videoUrl, setVideoUrl] = useState(initialData?.video_url || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!videoUrl.trim()) {
      newErrors.videoUrl = 'Video URL is required';
    } else {
      try {
        new URL(videoUrl);
      } catch {
        newErrors.videoUrl = 'Invalid URL format';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        video_url: videoUrl.trim(),
        order_index: orderIndex,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Chapter Title
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="Enter chapter title"
        />
        {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="Optional chapter description"
        />
      </div>

      <div>
        <label htmlFor="videoUrl" className="block text-sm font-medium text-gray-700">
          Video URL
        </label>
        <input
          type="url"
          id="videoUrl"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="https://example.com/video.mp4"
        />
        {errors.videoUrl && <p className="mt-1 text-sm text-red-600">{errors.videoUrl}</p>}
      </div>

      <div className="text-sm text-gray-500">
        Chapter {orderIndex + 1} in sequence
      </div>

      <div className="flex justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {isLoading ? 'Adding...' : submitLabel}
        </button>
      </div>
    </form>
  );
}