import { useState, useRef, useEffect } from 'react'
import { FiX, FiPlay, FiPause, FiVolume2, FiVolumeX, FiDownload, FiMaximize, FiChevronLeft, FiChevronRight, FiFile, FiImage, FiVideo, FiMic } from 'react-icons/fi'

const MediaViewer = ({ isOpen, onClose, media, currentIndex = 0, onIndexChange }) => {
  const [currentIdx, setCurrentIdx] = useState(currentIndex)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  
  const videoRef = useRef(null)
  const audioRef = useRef(null)
  const containerRef = useRef(null)
  const controlsTimeoutRef = useRef(null)

  useEffect(() => {
    setCurrentIdx(currentIndex)
  }, [currentIndex])

  // Only call onIndexChange when currentIdx actually changes, not when the function reference changes
  const prevIdxRef = useRef(currentIdx)
  useEffect(() => {
    if (prevIdxRef.current !== currentIdx && onIndexChange) {
      onIndexChange(currentIdx)
      prevIdxRef.current = currentIdx
    }
  }, [currentIdx])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return
      
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          goToPrevious()
          break
        case 'ArrowRight':
          goToNext()
          break
        case ' ':
          e.preventDefault()
          togglePlayPause()
          break
        case 'f':
        case 'F':
          toggleFullscreen()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  if (!isOpen || !media || media.length === 0) return null

  const currentMedia = media[currentIdx]
  const isVideo = currentMedia.type === 'video' || currentMedia.url.includes('.mp4') || currentMedia.url.includes('.webm')
  const isAudio = currentMedia.type === 'audio' || currentMedia.url.includes('.mp3') || currentMedia.url.includes('.wav')
  const isImage = currentMedia.type === 'image' || currentMedia.url.includes('.jpg') || currentMedia.url.includes('.png') || currentMedia.url.includes('.jpeg')

  const goToPrevious = () => {
    setCurrentIdx(prev => prev > 0 ? prev - 1 : media.length - 1)
  }

  const goToNext = () => {
    setCurrentIdx(prev => prev < media.length - 1 ? prev + 1 : 0)
  }

  const togglePlayPause = () => {
    if (isVideo && videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play()
        setIsPlaying(true)
      } else {
        videoRef.current.pause()
        setIsPlaying(false)
      }
    } else if (isAudio && audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play()
        setIsPlaying(true)
      } else {
        audioRef.current.pause()
        setIsPlaying(false)
      }
    }
  }

  const toggleMute = () => {
    if (isVideo && videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    } else if (isAudio && audioRef.current) {
      audioRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    
    if (isVideo && videoRef.current) {
      videoRef.current.volume = newVolume
    } else if (isAudio && audioRef.current) {
      audioRef.current.volume = newVolume
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = currentMedia.url
    link.download = currentMedia.name || `media-${currentIdx + 1}`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const resetControlsTimeout = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false)
    }, 3000)
  }

  const handleMouseMove = () => {
    resetControlsTimeout()
  }

  const getMediaIcon = () => {
    if (isVideo) return <FiVideo className="text-blue-500" />
    if (isAudio) return <FiMic className="text-green-500" />
    if (isImage) return <FiImage className="text-purple-500" />
    return <FiFile className="text-gray-500" />
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
      <div 
        ref={containerRef}
        className="relative w-full h-full flex items-center justify-center"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setShowControls(false)}
      >
        {/* Media Content */}
        <div className="relative max-w-full max-h-full">
          {isImage && (
            <img 
              src={currentMedia.url} 
              alt={currentMedia.name || 'Media'}
              className="max-w-full max-h-full object-contain"
            />
          )}
          
          {isVideo && (
            <video
              ref={videoRef}
              src={currentMedia.url}
              className="max-w-full max-h-full"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              onVolumeChange={(e) => setVolume(e.target.volume)}
              controls={false}
            />
          )}
          
          {isAudio && (
            <div className="flex flex-col items-center justify-center h-64 w-96 bg-gray-800 rounded-lg">
              <div className="text-6xl mb-4 text-white">
                <FiMic />
              </div>
              <p className="text-white text-lg mb-4">{currentMedia.name || 'Audio File'}</p>
              <audio
                ref={audioRef}
                src={currentMedia.url}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                onVolumeChange={(e) => setVolume(e.target.volume)}
              />
            </div>
          )}
        </div>

        {/* Navigation Arrows */}
        {media.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-70 transition-all"
            >
              <FiChevronLeft size={24} />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-70 transition-all"
            >
              <FiChevronRight size={24} />
            </button>
          </>
        )}

        {/* Controls Overlay */}
        {showControls && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Top Controls */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-auto">
              <div className="flex items-center gap-2">
                {getMediaIcon()}
                <span className="text-white text-sm">
                  {currentMedia.name || `Media ${currentIdx + 1}`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
                >
                  <FiDownload size={20} />
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
                >
                  <FiMaximize size={20} />
                </button>
                <button
                  onClick={onClose}
                  className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
                >
                  <FiX size={20} />
                </button>
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-4 left-4 right-4 pointer-events-auto">
              {/* Media Counter */}
              {media.length > 1 && (
                <div className="text-center text-white text-sm mb-4">
                  {currentIdx + 1} of {media.length}
                </div>
              )}

              {/* Playback Controls */}
              {(isVideo || isAudio) && (
                <div className="flex items-center justify-center gap-4 bg-black bg-opacity-50 rounded-lg p-4">
                  <button
                    onClick={togglePlayPause}
                    className="bg-white bg-opacity-20 text-white p-3 rounded-full hover:bg-opacity-30 transition-all"
                  >
                    {isPlaying ? <FiPause size={24} /> : <FiPlay size={24} />}
                  </button>
                  
                  <button
                    onClick={toggleMute}
                    className="bg-white bg-opacity-20 text-white p-2 rounded-full hover:bg-opacity-30 transition-all"
                  >
                    {isMuted ? <FiVolumeX size={20} /> : <FiVolume2 size={20} />}
                  </button>
                  
                  <div className="flex items-center gap-2">
                    <FiVolume2 size={16} className="text-white" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="w-20"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Thumbnail Strip */}
        {media.length > 1 && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex gap-2 pointer-events-auto">
            {media.map((item, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIdx(idx)}
                className={`w-16 h-16 rounded overflow-hidden border-2 ${
                  idx === currentIdx ? 'border-white' : 'border-transparent'
                }`}
              >
                {item.type === 'image' || item.url.includes('.jpg') || item.url.includes('.png') ? (
                  <img src={item.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center text-white">
                    {item.type === 'video' ? <FiVideo size={20} /> : <FiMic size={20} />}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MediaViewer
