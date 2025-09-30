import React, { useRef, useEffect, useState, useCallback } from 'react';

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mediaStream: MediaStream;
    const getMedia = async () => {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment" } 
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Could not access the camera. Please check your browser permissions.");
      }
    };

    getMedia();

    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCaptureClick = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        canvas.toBlob(blob => {
          if (blob) {
            onCapture(blob);
          }
        }, 'image/jpeg', 0.95);
      }
    }
  }, [onCapture]);
  
  const handleClose = () => {
      if (stream) {
          stream.getTracks().forEach(track => track.stop());
      }
      onClose();
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-2xl p-4 border border-gray-700 w-full max-w-4xl">
        <div className="relative">
          {error ? (
            <div className="h-96 flex items-center justify-center text-red-400">{error}</div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-auto max-h-[70vh] rounded-md bg-black"
            />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>
        <div className="flex justify-center space-x-4 mt-4">
          <button
            onClick={handleCaptureClick}
            disabled={!!error}
            className="px-8 py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            aria-label="Capture image"
          >
            Capture
          </button>
          <button
            onClick={handleClose}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-full transition-colors duration-200"
            aria-label="Close camera"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;
