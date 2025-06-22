'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { nanoid } from 'nanoid';

// Core color palette (6 colors)
const COLOR_PALETTE = [
  '#000000', // Black
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#8B5CF6', // Purple
];

// Visual brush sizes with dots
const BRUSH_SIZES = [
  { size: 2, dotSize: 'w-1.5 h-1.5' },
  { size: 5, dotSize: 'w-3 h-3' },
  { size: 10, dotSize: 'w-5 h-5' },
  { size: 20, dotSize: 'w-7 h-7' },
];

interface SavedDrawing {
  id: string;
  name: string;
  thumbnail: string;
  data: string;
  timestamp: number;
  filename: string; // 고정 파일명 (예: canvas_0001.png)
}

interface DrawingStroke {
  id: string;
  points: Array<{ x: number; y: number }>;
  color: string;
  width: number;
  timestamp: number;
  isEraser?: boolean; // 지우개 스트로크 구분
}


export function DrawingApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentBrushSize, setCurrentBrushSize] = useState(5);
  const [customBrushSize, setCustomBrushSize] = useState(5);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [savedDrawings, setSavedDrawings] = useState<SavedDrawing[]>([]);
  const [history, setHistory] = useState<Array<{dataURL: string, width: number, height: number}>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<DrawingStroke | null>(null);
  const [isErasing, setIsErasing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isServerConnected, setIsServerConnected] = useState(true);
  const [currentEditingDrawing, setCurrentEditingDrawing] = useState<SavedDrawing | null>(null); // 현재 편집 중인 그림 추적
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false); // 모바일 사이드바 토글
  const lastSavedHistoryIndex = useRef(-1);

  // Initialize and load last drawing from API
  useEffect(() => {
    const initApp = async () => {
      try {
        // 저장된 그림들 로드
        const saved = localStorage.getItem('simpleDrawings');
        if (saved) {
          const drawings: SavedDrawing[] = JSON.parse(saved);
          
          // 기존 그림들에 filename이 없으면 자동 생성
          const updatedDrawings = drawings.map((drawing, index) => {
            if (!drawing.filename) {
              const number = index + 1;
              return {
                ...drawing,
                filename: `canvas_${number.toString().padStart(4, '0')}.png`
              };
            }
            return drawing;
          });
          
          setSavedDrawings(updatedDrawings);
          
          // 업데이트된 그림들을 다시 저장
          if (updatedDrawings.some((d, i) => d !== drawings[i])) {
            localStorage.setItem('simpleDrawings', JSON.stringify(updatedDrawings));
          }
        }
        
        // API 서버에서 마지막 그림 불러오기
        try {
          const response = await fetch('/api/drawing');
          if (!response.ok) {
            console.log('No previous drawing found on server');
            return;
          }
          
          const drawingData = await response.json();
          if (!drawingData.dataURL || drawingData.dataURL.length === 0) {
            console.log('No drawing data available on server');
            return;
          }
          
          // 캔버스가 초기화된 후에 그림 로드
          if (!canvasRef.current || !containerRef.current) return;
          
          const canvas = canvasRef.current;
          const container = containerRef.current;
          const ctx = canvas.getContext('2d')!;
          const rect = container.getBoundingClientRect();
          
          const img = new Image();
          img.onload = () => {
            // 백그라운드로 하얗색 채우기
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, rect.width, rect.height);
            
            // 이미지를 캔버스에 맞게 스케일링
            const scaleX = rect.width / img.width;
            const scaleY = rect.height / img.height;
            const scale = Math.min(scaleX, scaleY);
            
            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;
            const x = (rect.width - scaledWidth) / 2;
            const y = (rect.height - scaledHeight) / 2;
            
            ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
            
            // 히스토리에 저장하고 저장된 상태로 마크
            saveCanvasState();
            setHasUnsavedChanges(false);
            // saveCanvasState가 호출되면 히스토리 인덱스가 0이 되므로 그에 맞춰 설정
            setTimeout(() => {
              lastSavedHistoryIndex.current = 0;
            }, 0);
            
            console.log('Last drawing loaded from API server');
          };
          img.src = drawingData.dataURL;
          
        } catch (error) {
          console.error('Failed to load last drawing from API:', error);
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };
    initApp();
  }, []);

  // Initialize canvas and drawing engine
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const initCanvas = () => {
      const canvas = canvasRef.current!;
      const container = containerRef.current!;
      const rect = container.getBoundingClientRect();
      
      // Set canvas size with proper DPR scaling
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';

      const ctx = canvas.getContext('2d')!;
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, rect.width, rect.height);
      
      // Save initial state
      saveCanvasState();
    };

    initCanvas();
    window.addEventListener('resize', initCanvas);
    
    return () => {
      window.addEventListener('resize', initCanvas);
    };
  }, []);

  // Setup drawing events
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    let currentPath: { x: number; y: number }[] = [];

    const getEventPos = (e: MouseEvent | TouchEvent): { x: number; y: number } => {
      const rect = canvas.getBoundingClientRect();
      let clientX: number, clientY: number;

      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    };

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      setIsDrawing(true);
      
      const pos = getEventPos(e);
      currentPath = [pos];
      
      // 새 스트로크 시작
      const newStroke: DrawingStroke = {
        id: nanoid(),
        points: [pos],
        color: isErasing ? 'eraser' : currentColor, // 지우개는 특별한 색상으로 표시
        width: currentBrushSize,
        timestamp: Date.now(),
        isEraser: isErasing
      };
      setCurrentStroke(newStroke);
      
      const ctx = canvas.getContext('2d')!;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      
      // 지우개 모드와 일반 드로잉 모드 구분
      if (isErasing) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)'; // 지우기에는 색상 무관
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = currentColor;
      }
      
      ctx.lineWidth = currentBrushSize;
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing) return;
      e.preventDefault();
      
      const pos = getEventPos(e);
      currentPath.push(pos);
      
      // 현재 스트로크에 점 추가
      if (currentStroke) {
        const updatedStroke = {
          ...currentStroke,
          points: [...currentStroke.points, pos]
        };
        setCurrentStroke(updatedStroke);
      }
      
      const ctx = canvas.getContext('2d')!;
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    };

    const stopDrawing = () => {
      if (!isDrawing) return;
      setIsDrawing(false);
      
      // 완성된 스트로크를 배열에 저장
      if (currentStroke && currentStroke.points.length > 1) {
        setStrokes(prev => [...prev, currentStroke]);
        setHasUnsavedChanges(true); // 변경사항 있음 표시
      }
      setCurrentStroke(null);
      
      saveCanvasState();
    };

    // Mouse events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // Touch events
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);

    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseout', stopDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, [currentColor, currentBrushSize, isDrawing, isErasing, currentStroke]);


  // 스트로크 단위 지우기
  const eraseLastStroke = useCallback(() => {
    if (strokes.length === 0) return;
    
    const newStrokes = strokes.slice(0, -1);
    setStrokes(newStrokes);
    redrawCanvas(newStrokes);
  }, [strokes]);

  // 전체 스트로크를 이용해 캔버스 다시 그리기
  const redrawCanvas = useCallback((strokesToRender: DrawingStroke[]) => {
    if (!canvasRef.current || !containerRef.current) return;
    
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas.getContext('2d')!;
    const rect = container.getBoundingClientRect();
    
    // 캔버스 초기화 (하얗색 배경)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    
    // 모든 스트로크 다시 그리기
    strokesToRender.forEach(stroke => {
      if (stroke.points.length < 2) return;
      
      ctx.beginPath();
      
      // 지우개 스트로크와 일반 스트로크 구분
      if (stroke.isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color;
      }
      
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      stroke.points.slice(1).forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      
      ctx.stroke();
    });
    
    // 상태 저장
    saveCanvasState();
  }, []);

  const resizeCanvasData = (canvas: HTMLCanvasElement, targetWidth: number = 800, targetHeight: number = 600): string => {
    const resizeCanvas = document.createElement('canvas');
    const resizeCtx = resizeCanvas.getContext('2d')!;
    
    resizeCanvas.width = targetWidth;
    resizeCanvas.height = targetHeight;
    
    // White background
    resizeCtx.fillStyle = '#ffffff';
    resizeCtx.fillRect(0, 0, targetWidth, targetHeight);
    
    // Calculate scale to fit while maintaining aspect ratio
    const scaleX = targetWidth / canvas.width;
    const scaleY = targetHeight / canvas.height;
    const scale = Math.min(scaleX, scaleY);
    
    const scaledWidth = canvas.width * scale;
    const scaledHeight = canvas.height * scale;
    const x = (targetWidth - scaledWidth) / 2;
    const y = (targetHeight - scaledHeight) / 2;
    
    resizeCtx.drawImage(canvas, x, y, scaledWidth, scaledHeight);
    
    return resizeCanvas.toDataURL();
  };

  const saveCanvasState = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) return;
    
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    const historyEntry = {
      dataURL: canvas.toDataURL(),
      width: rect.width,
      height: rect.height
    };
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(historyEntry);
    
    setHistory(newHistory);
    const newIndex = newHistory.length - 1;
    setHistoryIndex(newIndex);
    
    // Check if we have unsaved changes (compare with last saved index)
    if (lastSavedHistoryIndex.current < newIndex) {
      setHasUnsavedChanges(true);
    } else if (lastSavedHistoryIndex.current === newIndex) {
      setHasUnsavedChanges(false);
    }
    
    // Save to server for MCP access (resized to 800x600)
    const resizedDataURL = resizeCanvasData(canvas, 800, 600);
    const payload = {
      dataURL: resizedDataURL,
      width: 800,
      height: 600,
      filename: 'current-active.png' // 현재 활성 그림은 고정 파일명
    };
    
    console.log('[DrawingApp] Sending drawing to server:', {
      dataURLLength: resizedDataURL.length,
      width: payload.width,
      height: payload.height,
      filename: payload.filename,
      timestamp: new Date().toISOString()
    });
    
    fetch('/api/drawing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(async (response) => {
      const result = await response.json();
      console.log('[DrawingApp] Server response:', {
        status: response.status,
        ok: response.ok,
        result: result
      });
      setIsServerConnected(true);
    }).catch((error) => {
      console.error('[DrawingApp] Failed to send drawing to server:', error);
      setIsServerConnected(false);
    });
  }, [history, historyIndex]);

  const restoreCanvasState = useCallback((historyEntry: {dataURL: string, width: number, height: number}) => {
    if (!canvasRef.current || !containerRef.current) return;
    
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas.getContext('2d')!;
    const currentRect = container.getBoundingClientRect();
    
    const img = new Image();
    img.onload = () => {
      // Clear canvas with white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, currentRect.width, currentRect.height);
      
      // Calculate scale to fit the historical image in current canvas
      const scaleX = currentRect.width / historyEntry.width;
      const scaleY = currentRect.height / historyEntry.height;
      const scale = Math.min(scaleX, scaleY);
      
      // Center the image
      const scaledWidth = historyEntry.width * scale;
      const scaledHeight = historyEntry.height * scale;
      const x = (currentRect.width - scaledWidth) / 2;
      const y = (currentRect.height - scaledHeight) / 2;
      
      ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
    };
    img.src = historyEntry.dataURL;
  }, []);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      restoreCanvasState(history[newIndex]);
      
      // Update unsaved changes status
      setHasUnsavedChanges(lastSavedHistoryIndex.current !== newIndex);
    }
  }, [historyIndex, history, restoreCanvasState]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      restoreCanvasState(history[newIndex]);
      
      // Update unsaved changes status
      setHasUnsavedChanges(lastSavedHistoryIndex.current !== newIndex);
    }
  }, [historyIndex, history, restoreCanvasState]);


  const clearCanvas = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) return;
    
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas.getContext('2d')!;
    const rect = container.getBoundingClientRect();
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    
    setHistory([]);
    setHistoryIndex(-1);
    setStrokes([]); // 스트로크 배열도 초기화
    setHasUnsavedChanges(false); // unsaved changes 리셋
    setCurrentEditingDrawing(null); // 편집 중인 그림 리셋
    lastSavedHistoryIndex.current = -1; // 저장 인덱스도 리셋
    saveCanvasState();
  }, [saveCanvasState]);

  const clearAllDrawings = useCallback(() => {
    const isConfirmed = window.confirm('Are you sure you want to delete all saved drawings? This action cannot be undone.');
    
    if (isConfirmed) {
      // 로컬 스토리지에서 삭제
      setSavedDrawings([]);
      localStorage.removeItem('simpleDrawings');
      
      // 현재 캔버스도 초기화
      clearCanvas();
      
      console.log('All drawings have been deleted.');
    }
  }, [clearCanvas]);

  const saveCurrentDrawing = useCallback(async () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const thumbnail = createThumbnail(canvas);
    const drawingData = canvas.toDataURL();
    
    let drawing: SavedDrawing;
    let newDrawings: SavedDrawing[];
    
    if (currentEditingDrawing) {
      // 기존 그림 업데이트
      drawing = {
        ...currentEditingDrawing,
        thumbnail,
        data: drawingData,
        timestamp: Date.now(), // 수정 시간 업데이트
      };
      
      // 기존 그림을 새 데이터로 바꿔 넣기
      newDrawings = savedDrawings.map(d => 
        d.id === currentEditingDrawing.id ? drawing : d
      );
    } else {
      // 새로운 그림 생성
      const existingNumbers = savedDrawings
        .map(d => {
          const match = d.filename.match(/canvas_(\d+)\.png/);
          return match ? parseInt(match[1]) : 0;
        })
        .filter(n => n > 0);
      
      const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
      const filename = `canvas_${nextNumber.toString().padStart(4, '0')}.png`;
      
      drawing = {
        id: nanoid(),
        name: `Drawing ${new Date().toLocaleDateString()}`,
        thumbnail,
        data: drawingData,
        timestamp: Date.now(),
        filename,
      };
      
      // Save to local state (newest first)
      newDrawings = [drawing, ...savedDrawings].slice(0, 20);
      setCurrentEditingDrawing(drawing); // 새로 생성된 그림을 현재 편집 중으로 설정
    }
    
    try {
      // Save to API server with fixed filename
      const resizedDataURL = resizeCanvasData(canvas, 800, 600);
      await fetch('/api/drawing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataURL: resizedDataURL,
          width: 800,
          height: 600,
          filename: drawing.filename // 고정 파일명 사용
        })
      });
      
      setIsServerConnected(true);
      
      setSavedDrawings(newDrawings);
      localStorage.setItem('simpleDrawings', JSON.stringify(newDrawings));
      
      // 저장 후 unsaved changes 리셋 (현재 히스토리 인덱스로 업데이트)
      setHasUnsavedChanges(false);
      lastSavedHistoryIndex.current = historyIndex;
    } catch (error) {
      console.error('Failed to save drawing:', error);
      setIsServerConnected(false);
    }
  }, [savedDrawings, historyIndex, currentEditingDrawing]);

  // Redefine newDrawing with proper dependency after saveCurrentDrawing is defined
  const newDrawingWithSave = useCallback(() => {
    // Ask user if they want to save current drawing before starting new one
    if (history.length > 1) {
      const shouldSave = window.confirm('Do you want to save the current drawing before starting a new one?');
      if (shouldSave) {
        saveCurrentDrawing();
      }
    }
    clearCanvas();
  }, [history, saveCurrentDrawing, clearCanvas]);

  const saveDrawingAsFile = useCallback(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `drawing-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  }, []);


  const loadDrawing = useCallback(async (drawing: SavedDrawing) => {
    if (!canvasRef.current || !containerRef.current) return;
    
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas.getContext('2d')!;
    const rect = container.getBoundingClientRect();
    
    const img = new Image();
    img.onload = async () => {
      // Clear canvas with white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, rect.width, rect.height);
      
      // Draw the loaded image to fit the current canvas
      const scaleX = rect.width / img.width;
      const scaleY = rect.height / img.height;
      const scale = Math.min(scaleX, scaleY);
      
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      const x = (rect.width - scaledWidth) / 2;
      const y = (rect.height - scaledHeight) / 2;
      
      ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
      
      // Reset history and save this as new starting point
      setHistory([]);
      setHistoryIndex(-1);
      setStrokes([]); // 스트로크 배열도 초기화
      setHasUnsavedChanges(false); // unsaved changes 리셋
      setCurrentEditingDrawing(drawing); // 로드된 그림을 현재 편집 중으로 설정
      lastSavedHistoryIndex.current = -1; // 저장 인덱스도 리셋
      saveCanvasState();
      
      // 중요: 로드된 그림을 현재 활성화된 그림으로 API 서버에 전송
      try {
        const resizedData = resizeCanvasData(canvas, 800, 600);
        
        await fetch('/api/drawing', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dataURL: resizedData,
            width: 800,
            height: 600,
            filename: drawing.filename // 로드된 그림의 고정 파일명 사용
          }),
        });
        
        console.log('Loaded drawing sent to API server successfully');
      } catch (error) {
        console.error('Failed to send loaded drawing to API server:', error);
      }
    };
    img.src = drawing.data;
  }, [saveCanvasState]);

  const deleteDrawing = useCallback((id: string) => {
    // 삭제하려는 그림이 현재 편집 중인 그림이라면 편집 상태 초기화
    if (currentEditingDrawing && currentEditingDrawing.id === id) {
      setCurrentEditingDrawing(null);
      setHasUnsavedChanges(false);
    }
    
    const newDrawings = savedDrawings.filter(d => d.id !== id);
    setSavedDrawings(newDrawings);
    localStorage.setItem('simpleDrawings', JSON.stringify(newDrawings));
  }, [savedDrawings, currentEditingDrawing]);

  // API 서버에서 마지막 그림 불러오기
  const loadLastDrawingFromAPI = useCallback(async () => {
    try {
      const response = await fetch('/api/drawing');
      if (!response.ok) {
        console.log('No previous drawing found on server');
        return;
      }
      
      const drawingData = await response.json();
      if (!drawingData.dataURL || drawingData.dataURL.length === 0) {
        console.log('No drawing data available on server');
        return;
      }
      
      // 캔버스가 초기화된 후에 그림 로드
      if (!canvasRef.current || !containerRef.current) return;
      
      const canvas = canvasRef.current;
      const container = containerRef.current;
      const ctx = canvas.getContext('2d')!;
      const rect = container.getBoundingClientRect();
      
      const img = new Image();
      img.onload = () => {
        // 백그라운드로 하얗색 채우기
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, rect.width, rect.height);
        
        // 이미지를 캔버스에 맞게 스케일링
        const scaleX = rect.width / img.width;
        const scaleY = rect.height / img.height;
        const scale = Math.min(scaleX, scaleY);
        
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const x = (rect.width - scaledWidth) / 2;
        const y = (rect.height - scaledHeight) / 2;
        
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
        
        // 히스토리에 저장하고 저장된 상태로 마크
        saveCanvasState();
        setHasUnsavedChanges(false);
        // saveCanvasState가 호출되면 히스토리 인덱스가 0이 되므로 그에 맞춰 설정
        setTimeout(() => {
          lastSavedHistoryIndex.current = 0;
        }, 0);
        
        console.log('Last drawing loaded from API server');
      };
      img.src = drawingData.dataURL;
      
    } catch (error) {
      console.error('Failed to load last drawing from API:', error);
    }
  }, [saveCanvasState]);

  const createThumbnail = (canvas: HTMLCanvasElement): string => {
    const thumbnailCanvas = document.createElement('canvas');
    const ctx = thumbnailCanvas.getContext('2d')!;
    
    // 16:9 비율로 레티나 디스플레이 고려한 고해상도 (480x270)
    const thumbnailWidth = 480;
    const thumbnailHeight = 270;
    
    thumbnailCanvas.width = thumbnailWidth;
    thumbnailCanvas.height = thumbnailHeight;
    
    // 흰색 배경
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, thumbnailWidth, thumbnailHeight);
    
    // 최고 품질의 이미지 렌더링 설정
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // 캔버스 이미지를 썸네일 크기에 맞게 스케일링
    const scaleX = thumbnailWidth / canvas.width;
    const scaleY = thumbnailHeight / canvas.height;
    const scale = Math.min(scaleX, scaleY);
    
    const scaledWidth = canvas.width * scale;
    const scaledHeight = canvas.height * scale;
    const x = (thumbnailWidth - scaledWidth) / 2;
    const y = (thumbnailHeight - scaledHeight) / 2;
    
    ctx.drawImage(canvas, x, y, scaledWidth, scaledHeight);
    
    // 최고 품질 PNG로 저장
    return thumbnailCanvas.toDataURL('image/png', 1.0);
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            e.preventDefault();
            undo();
            break;
          case 'y':
            e.preventDefault();
            redo();
            break;
          case 'n':
            e.preventDefault();
            newDrawingWithSave();
            break;
          case 's':
            e.preventDefault();
            saveDrawingAsFile();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history, undo, redo, newDrawingWithSave, saveDrawingAsFile]);

  // 창 닫기 시 자동 저장
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && strokes.length > 0) {
        // 비동기적으로 저장 시도
        saveCurrentDrawing();
        
        // 브라우저에 경고 메시지 표시
        e.preventDefault();
        const message = 'You have unsaved changes. Are you sure you want to leave?';
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, strokes.length, saveCurrentDrawing]);

  return (
    <div className={`h-screen flex ${isDarkMode ? 'dark' : ''}`}>
      <div className={`flex w-full h-full p-2 md:p-4 ${
        isDarkMode 
          ? 'bg-gradient-to-br from-indigo-500 to-purple-600' 
          : 'bg-gradient-to-br from-blue-50 to-indigo-100'
      }`}>
        <div className={`flex w-full h-full rounded-xl md:rounded-2xl shadow-2xl overflow-hidden ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`} style={{ minWidth: '320px' }}>
          
          {/* Mobile Sidebar Toggle */}
          <div className={`md:hidden fixed top-4 left-4 z-50`}>
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className={`p-3 rounded-lg shadow-lg transition-all duration-200 ${
                isDarkMode 
                  ? 'bg-gray-800 text-white hover:bg-gray-700' 
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <i className={`mdi ${isMobileSidebarOpen ? 'mdi-close' : 'mdi-menu'} text-xl`}></i>
            </button>
          </div>

          {/* Left Sidebar */}
          <div className={`w-96 border-r flex flex-col transition-transform duration-300 ${
            isDarkMode 
              ? 'bg-gray-900 border-gray-700' 
              : 'bg-gray-50 border-gray-200'
          } ${
            // Mobile: hide/show with transform, Desktop: always visible
            'md:relative md:translate-x-0 ' +
            (isMobileSidebarOpen 
              ? 'fixed inset-y-0 left-0 z-40 translate-x-0' 
              : 'fixed inset-y-0 left-0 z-40 -translate-x-full md:translate-x-0 hidden md:flex'
            )
          }`}>
            
            {/* Header */}
            <div className={`p-4 border-b flex justify-between items-center ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Draw-it
              </h1>
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 ${
                  isDarkMode 
                    ? 'bg-gray-800 hover:bg-gray-700' 
                    : 'bg-white hover:bg-gray-50 border border-gray-200'
                }`}
                title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
              >
                <i className={`mdi ${
                  isDarkMode ? 'mdi-weather-sunny' : 'mdi-weather-night'
                } text-xl ${
                  isDarkMode ? 'text-yellow-400' : 'text-gray-600'
                }`}></i>
              </button>
            </div>

            {/* Drawing Management */}
            <div className={`p-4 border-b ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={newDrawingWithSave}
                  className={`flex flex-col items-center p-3 rounded-lg transition-all duration-200 hover:scale-105 shadow-sm ${
                    isDarkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                  }`}
                  title="New Drawing"
                >
                  <i className="mdi mdi-plus-box text-2xl mb-1"></i>
                  <span className="text-xs font-medium">New</span>
                </button>
                <button
                  onClick={saveCurrentDrawing}
                  className={`flex flex-col items-center p-3 rounded-lg transition-all duration-200 hover:scale-105 shadow-sm ${
                    isDarkMode 
                      ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' 
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300 border border-gray-300'
                  }`}
                  title="Save Drawing"
                >
                  <i className="mdi mdi-content-save-outline text-2xl mb-1"></i>
                  <span className="text-xs font-medium">Save</span>
                </button>
                <button
                  onClick={clearAllDrawings}
                  className={`flex flex-col items-center p-3 rounded-lg transition-all duration-200 hover:scale-105 shadow-sm ${
                    isDarkMode 
                      ? 'bg-gray-500 text-white hover:bg-gray-400' 
                      : 'bg-gray-300 text-gray-800 hover:bg-gray-400 border border-gray-400'
                  }`}
                  title="Delete All Drawings"
                >
                  <i className="mdi mdi-trash-can-outline text-2xl mb-1"></i>
                  <span className="text-xs font-medium">Delete</span>
                </button>
              </div>
            </div>

            {/* Saved Drawings */}
            <div className="flex-1 px-4 py-2 overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                {savedDrawings.map((drawing) => {
                  const isCurrentlyEditing = currentEditingDrawing && currentEditingDrawing.id === drawing.id;
                  return (
                  <div
                    key={drawing.id}
                    className={`relative group rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-lg overflow-hidden ${
                      isCurrentlyEditing
                        ? (isDarkMode ? 'bg-blue-900/30 border-blue-400' : 'bg-blue-50 border-blue-400')
                        : (isDarkMode 
                          ? 'bg-gray-800 border-gray-600 hover:border-blue-400' 
                          : 'bg-white border-gray-200 hover:border-blue-400')
                    }`}
                    onClick={() => loadDrawing(drawing)}
                  >
                    <div className="aspect-video w-full min-h-[120px]">
                      <img
                        src={drawing.thumbnail}
                        alt={drawing.name}
                        className="w-full h-full object-cover rounded-t-lg"
                      />
                    </div>
                    {/* 현재 편집 중 표시 */}
                    {isCurrentlyEditing && (
                      <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium shadow-sm">
                        Editing
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDrawing(drawing.id);
                      }}
                      className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center text-sm hover:bg-red-600 shadow-sm"
                      title="Delete Drawing"
                    >
                      <i className="mdi mdi-close text-sm"></i>
                    </button>
                  </div>
                  );
                })}
                {savedDrawings.length === 0 && (
                  <div className={`text-center py-8 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    <i className="mdi mdi-image-outline text-4xl mb-2 block"></i>
                    <p className="text-sm">No saved drawings</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col md:ml-0">
            
            {/* Icon-Based Toolbar */}
            <div className={`px-3 md:px-6 py-3 md:py-4 border-b shadow-sm ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              {/* Desktop: Single row, Mobile: Two rows */}
              <div className="hidden md:flex items-center gap-6">
                
                {/* Color Palette */}
                <div className="flex items-center gap-2">
                  {COLOR_PALETTE.map((color) => (
                    <button
                      key={color}
                      onClick={() => setCurrentColor(color)}
                      className={`w-7 h-7 rounded-full transition-all duration-200 hover:scale-110 shadow-sm ${
                        currentColor === color 
                          ? 'ring-2 ring-blue-500 ring-offset-2' 
                          : `hover:ring-2 hover:ring-gray-300 hover:ring-offset-1 ${
                              !isDarkMode && (color === '#FFFFFF' || color === '#FFECD2') ? 'border border-gray-300' : ''
                            }`
                      }`}
                      style={{ backgroundColor: color }}
                      title={`Color: ${color}`}
                    />
                  ))}
                  <input
                    type="color"
                    value={currentColor}
                    onChange={(e) => setCurrentColor(e.target.value)}
                    className={`w-7 h-7 rounded-full border-2 cursor-pointer shadow-sm ${
                      isDarkMode ? 'border-gray-600' : 'border-gray-300'
                    }`}
                    title="Custom Color"
                  />
                </div>

                {/* Divider */}
                <div className={`w-px h-8 ${
                  isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
                }`}></div>

                {/* Brush Sizes (Visual Dots) */}
                <div className="flex items-center gap-3">
                  {BRUSH_SIZES.map((brush) => (
                    <button
                      key={brush.size}
                      onClick={() => {
                        setCurrentBrushSize(brush.size);
                        setCustomBrushSize(brush.size);
                      }}
                      className={`p-3 rounded-lg transition-all duration-200 hover:scale-105 flex items-center justify-center ${
                        currentBrushSize === brush.size
                          ? (isDarkMode ? 'bg-gray-700' : 'bg-gray-200 border border-gray-300')
                          : (isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100')
                      }`}
                      title={`Brush Size: ${brush.size}px`}
                    >
                      <div className={`${brush.dotSize} rounded-full transition-colors duration-200 ${
                        currentBrushSize === brush.size
                          ? 'bg-blue-600'
                          : (isDarkMode ? 'bg-gray-400' : 'bg-gray-500')
                      }`}></div>
                    </button>
                  ))}
                </div>

                {/* Divider */}
                <div className={`w-px h-8 ${
                  isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
                }`}></div>

                {/* Tools */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsErasing(false)}
                    className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                      !isErasing
                        ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-500'
                        : `${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`
                    }`}
                    title="Brush Tool"
                  >
                    <i className="mdi mdi-brush text-xl"></i>
                  </button>
                  <button
                    onClick={() => setIsErasing(true)}
                    className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                      isErasing
                        ? 'bg-red-100 text-red-600 ring-2 ring-red-500'
                        : `${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`
                    }`}
                    title="Eraser Tool"
                  >
                    <i className="mdi mdi-eraser text-xl"></i>
                  </button>
                </div>

                {/* Divider */}
                <div className={`w-px h-8 ${
                  isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
                }`}></div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={undo}
                    disabled={historyIndex <= 0}
                    className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                      isDarkMode 
                        ? 'text-gray-300 hover:bg-gray-700' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    title="Undo"
                  >
                    <i className="mdi mdi-undo text-xl"></i>
                  </button>
                  <button
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                    className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                      isDarkMode 
                        ? 'text-gray-300 hover:bg-gray-700' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    title="Redo"
                  >
                    <i className="mdi mdi-redo text-xl"></i>
                  </button>
                  <button
                    onClick={clearCanvas}
                    className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 hover:text-red-600 ${
                      isDarkMode 
                        ? 'text-gray-300 hover:bg-red-900/20' 
                        : 'text-gray-600 hover:bg-red-50'
                    }`}
                    title="Clear Canvas"
                  >
                    <i className="mdi mdi-trash-can-outline text-xl"></i>
                  </button>
                </div>

                {/* Divider */}
                <div className={`w-px h-8 ${
                  isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
                }`}></div>

                {/* Export */}
                <button
                  onClick={saveDrawingAsFile}
                  className={`p-2 rounded-lg text-white transition-all duration-200 hover:scale-105 shadow-md ${
                    isDarkMode 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                  title="Export PNG"
                >
                  <i className="mdi mdi-download text-xl"></i>
                </button>

                {/* Status indicators */}
                <div className={`ml-auto flex items-center gap-4 text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {hasUnsavedChanges ? (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                      <span>Unsaved</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span>Saved</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${
                      isServerConnected ? 'bg-green-400' : 'bg-red-400'
                    }`}></div>
                    <span className="text-xs">
                      {isServerConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Mobile: Two-row layout */}
              <div className="md:hidden space-y-3">
                {/* First Row: Colors and Brush Sizes */}
                <div className="flex items-center justify-between gap-3">
                  {/* Color Palette */}
                  <div className="flex items-center gap-1.5">
                    {COLOR_PALETTE.map((color) => (
                      <button
                        key={color}
                        onClick={() => setCurrentColor(color)}
                        className={`w-6 h-6 rounded-full transition-all duration-200 hover:scale-110 shadow-sm ${
                          currentColor === color 
                            ? 'ring-2 ring-blue-500 ring-offset-1' 
                            : `hover:ring-2 hover:ring-gray-300 hover:ring-offset-1 ${
                                !isDarkMode && (color === '#FFFFFF' || color === '#FFECD2') ? 'border border-gray-300' : ''
                              }`
                        }`}
                        style={{ backgroundColor: color }}
                        title={`Color: ${color}`}
                      />
                    ))}
                    <input
                      type="color"
                      value={currentColor}
                      onChange={(e) => setCurrentColor(e.target.value)}
                      className={`w-6 h-6 rounded-full border-2 cursor-pointer shadow-sm ${
                        isDarkMode ? 'border-gray-600' : 'border-gray-300'
                      }`}
                      title="Custom Color"
                    />
                  </div>
                  
                  {/* Brush Sizes */}
                  <div className="flex items-center gap-2">
                    {BRUSH_SIZES.map((brush) => (
                      <button
                        key={brush.size}
                        onClick={() => {
                          setCurrentBrushSize(brush.size);
                          setCustomBrushSize(brush.size);
                        }}
                        className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 flex items-center justify-center ${
                          currentBrushSize === brush.size
                            ? (isDarkMode ? 'bg-gray-700' : 'bg-gray-200 border border-gray-300')
                            : (isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100')
                        }`}
                        title={`Brush Size: ${brush.size}px`}
                      >
                        <div className={`${brush.dotSize.replace('w-', 'w-').replace('h-', 'h-')} rounded-full transition-colors duration-200 ${
                          currentBrushSize === brush.size
                            ? 'bg-blue-600'
                            : (isDarkMode ? 'bg-gray-400' : 'bg-gray-500')
                        }`}></div>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Second Row: Tools and Actions */}
                <div className="flex items-center justify-between">
                  {/* Tools */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsErasing(false)}
                      className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                        !isErasing
                          ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-500'
                          : `${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`
                      }`}
                      title="Brush Tool"
                    >
                      <i className="mdi mdi-brush text-lg"></i>
                    </button>
                    <button
                      onClick={() => setIsErasing(true)}
                      className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                        isErasing
                          ? 'bg-red-100 text-red-600 ring-2 ring-red-500'
                          : `${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`
                      }`}
                      title="Eraser Tool"
                    >
                      <i className="mdi mdi-eraser text-lg"></i>
                    </button>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={undo}
                      disabled={historyIndex <= 0}
                      className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                        isDarkMode 
                          ? 'text-gray-300 hover:bg-gray-700' 
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      title="Undo"
                    >
                      <i className="mdi mdi-undo text-lg"></i>
                    </button>
                    <button
                      onClick={redo}
                      disabled={historyIndex >= history.length - 1}
                      className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                        isDarkMode 
                          ? 'text-gray-300 hover:bg-gray-700' 
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      title="Redo"
                    >
                      <i className="mdi mdi-redo text-lg"></i>
                    </button>
                    <button
                      onClick={clearCanvas}
                      className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 hover:text-red-600 ${
                        isDarkMode 
                          ? 'text-gray-300 hover:bg-red-900/20' 
                          : 'text-gray-600 hover:bg-red-50'
                      }`}
                      title="Clear Canvas"
                    >
                      <i className="mdi mdi-trash-can-outline text-lg"></i>
                    </button>
                    <button
                      onClick={saveDrawingAsFile}
                      className={`p-2 rounded-lg text-white transition-all duration-200 hover:scale-105 shadow-md ${
                        isDarkMode 
                          ? 'bg-blue-600 hover:bg-blue-700' 
                          : 'bg-blue-500 hover:bg-blue-600'
                      }`}
                      title="Export PNG"
                    >
                      <i className="mdi mdi-download text-lg"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Canvas */}
            <div 
              ref={containerRef}
              className={`flex-1 relative ${
                isDarkMode ? 'bg-gray-800' : 'bg-white'
              }`}
            >
              <canvas
                ref={canvasRef}
                className={`w-full h-full ${isErasing ? 'cursor-crosshair' : 'cursor-crosshair'}`}
                style={{ 
                  touchAction: 'none',
                  cursor: isErasing ? 'crosshair' : 'crosshair' // 나중에 지우개 전용 커서로 변경 가능
                }}
              />
            </div>

            {/* Status Bar */}
            <div className={`px-3 md:px-6 py-2 border-t flex justify-between items-center text-sm ${
              isDarkMode 
                ? 'bg-gray-900 border-gray-700 text-gray-400' 
                : 'bg-gray-50 border-gray-200 text-gray-600'
            }`}>
              <div className="flex items-center gap-2 md:gap-4">
                <div className="flex items-center gap-2">
                  <i className={`mdi ${isErasing ? 'mdi-eraser' : 'mdi-brush'} text-sm`}></i>
                  <span className="hidden sm:inline">{isErasing ? 'Eraser' : 'Brush'}</span>
                </div>
                {strokes.length > 0 && (
                  <div className="flex items-center gap-1">
                    <i className="mdi mdi-layers-outline text-sm"></i>
                    <span>{strokes.length}</span>
                  </div>
                )}
                {/* Mobile: Show save status */}
                <div className="md:hidden flex items-center gap-1">
                  {hasUnsavedChanges ? (
                    <>
                      <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                      <span className="text-xs">Unsaved</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-xs">Saved</span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-xs opacity-70 hidden md:block">
                ⌘Z: Undo • ⌘Y: Redo • ⌘N: New • ⌘S: Export
              </div>
              {/* Mobile: Theme toggle and menu */}
              <div className="md:hidden flex items-center gap-2">
                <button
                  onClick={toggleTheme}
                  className={`p-1.5 rounded-lg transition-all duration-200 ${
                    isDarkMode 
                      ? 'bg-gray-800 hover:bg-gray-700' 
                      : 'bg-white hover:bg-gray-50 border border-gray-200'
                  }`}
                  title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
                >
                  <i className={`mdi ${
                    isDarkMode ? 'mdi-weather-sunny' : 'mdi-weather-night'
                  } text-sm ${
                    isDarkMode ? 'text-yellow-400' : 'text-gray-600'
                  }`}></i>
                </button>
                <button
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className={`p-1.5 rounded-lg transition-all duration-200 ${
                    isDarkMode 
                      ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' 
                      : 'bg-white hover:bg-gray-50 border border-gray-200 text-gray-600'
                  }`}
                  title="Open Menu"
                >
                  <i className="mdi mdi-folder-image text-sm"></i>
                </button>
              </div>
            </div>
          </div>
          
          {/* Mobile Sidebar Overlay */}
          {isMobileSidebarOpen && (
            <div 
              className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}