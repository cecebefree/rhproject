import React, { useRef, useEffect } from 'react';

interface VideoPlayerProps {
  videoUrl: string;
  onEnded?: () => void;
  onProgress?: (progress: number) => void;
  autoPlay?: boolean;
}

export function VideoPlayer({ videoUrl, onEnded, onProgress, autoPlay = false }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (onProgress && video.duration) {
        const progress = (video.currentTime / video.duration) * 100;
        onProgress(progress);
      }
    };

    const handleEnded = () => {
      onEnded?.();
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [onEnded, onProgress]);

  return (
    <div className="relative bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        autoPlay={autoPlay}
        className="w-full aspect-video"
        controlsList="nodownload"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
}