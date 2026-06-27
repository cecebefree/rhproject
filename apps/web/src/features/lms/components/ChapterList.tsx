import React from 'react';
import type { ChapterWithProgress } from '../types/lms';

interface ChapterListProps {
  chapters: ChapterWithProgress[];
  currentChapterId?: string;
  onChapterSelect: (chapter: ChapterWithProgress) => void;
  lockedChapters?: Set<string>;
}

export function ChapterList({ chapters, currentChapterId, onChapterSelect, lockedChapters = new Set() }: ChapterListProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Content</h3>
      <ul className="space-y-2">
        {chapters.map((chapter, index) => {
          const isLocked = lockedChapters.has(chapter.id);
          const isActive = chapter.id === currentChapterId;
          const isCompleted = chapter.completed;

          return (
            <li key={chapter.id}>
              <button
                onClick={() => !isLocked && onChapterSelect(chapter)}
                disabled={isLocked}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                  isActive
                    ? 'bg-indigo-100 border-2 border-indigo-500'
                    : isLocked
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : isCompleted
                    ? 'bg-green-50 hover:bg-green-100'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isLocked
                    ? 'bg-gray-300 text-gray-500'
                    : 'bg-indigo-500 text-white'
                }`}>
                  {isCompleted ? '✓' : index + 1}
                </span>
                <div className="flex-1">
                  <p className={`font-medium ${isLocked ? 'text-gray-400' : 'text-gray-900'}`}>
                    {chapter.title}
                  </p>
                  {chapter.description && (
                    <p className="text-sm text-gray-500 line-clamp-1">{chapter.description}</p>
                  )}
                </div>
                {isLocked && (
                  <span className="text-gray-400 text-sm">🔒</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}