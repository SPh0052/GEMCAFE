import { useRef, useState } from 'react';

export const useVideoProcessor = () => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // 핵심: 두 캔버스를 하나로 합쳐서 캡처해야 합니다.
  const startRecording = (
    mainCanvas: HTMLCanvasElement, // 최종 결과물이 그려지는 캔버스
    audioStream: MediaStream
  ) => {
    if (isRecording) return;
    
    setIsRecording(true);
    chunksRef.current = [];

    // 1. 영상 스트림 추출 (이미 렌더링 루프에서 합성되고 있는 mainCanvas 사용)
    const stream = mainCanvas.captureStream(30);

    // 2. 오디오 트랙 추가
    audioStream.getAudioTracks().forEach(track => stream.addTrack(track));

    // 3. MediaRecorder 설정 (지원 가능한 mimeType 체크 로직 추가 권장)
    const options = {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 5000000 
    };

    try {
      const recorder = new MediaRecorder(stream, options);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `gem-cafe-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setIsRecording(false);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
    } catch (e) {
      console.error("MediaRecorder 시작 실패:", e);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  return { startRecording, stopRecording, isRecording };
};