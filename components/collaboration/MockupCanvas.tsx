'use client';

import { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Arrow, Circle, Rect, Line, Text, Group } from 'react-konva';
import { CardMockup } from '@/lib/supabase';
import { Comment, AnnotationTool } from '@/app/(dashboard)/mockups/[id]/page';
import { useUser, useOrganization } from '@/lib/hooks/useAuth';
import Konva from 'konva';

// Zoom configuration
const MIN_SCALE = 0.25; // 25%
const MAX_SCALE = 4.0; // 400%
const SCALE_STEP = 0.25; // 25% increments

interface MockupCanvasProps {
  mockup: CardMockup;
  comments: Comment[];
  activeTool: AnnotationTool;
  strokeColor: string;
  strokeWidth: number;
  scale: number;
  onScaleChange: (scale: number) => void;
  onCommentCreate: () => void;
  onCommentHover: (commentId: string | null) => void;
  hoveredCommentId: string | null;
  isCreator: boolean;
  canAnnotate: boolean;
}

export default function MockupCanvas({
  mockup,
  comments,
  activeTool,
  strokeColor,
  strokeWidth,
  scale,
  onScaleChange,
  onCommentCreate,
  onCommentHover,
  hoveredCommentId,
  isCreator,
  canAnnotate
}: MockupCanvasProps) {
  const { user } = useUser();
  const { organization } = useOrganization();
  const stageRef = useRef<Konva.Stage>(null);
  const [mockupImage, setMockupImage] = useState<HTMLImageElement | null>(null);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 800, height: 600 });

  // Pan state (scale now comes from props)
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPosition, setLastPanPosition] = useState({ x: 0, y: 0 });

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentShape, setCurrentShape] = useState<any>(null);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [commentPosition, setCommentPosition] = useState({ x: 0, y: 0 });
  const [commentText, setCommentText] = useState('');
  const [pendingAnnotationData, setPendingAnnotationData] = useState<any>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);

  // Load mockup image
  useEffect(() => {
    if (!mockup.mockup_image_url) return;

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = mockup.mockup_image_url;
    img.onload = () => {
      setMockupImage(img);

      // Calculate canvas dimensions to fit viewport while maintaining aspect ratio
      const container = document.getElementById('canvas-container');
      if (container) {
        const containerWidth = container.clientWidth - 64; // Account for padding
        const containerHeight = container.clientHeight - 64; // Account for padding
        const imageAspectRatio = img.width / img.height;

        let canvasWidth = containerWidth;
        let canvasHeight = canvasWidth / imageAspectRatio;

        // If height is too tall, constrain by height instead
        if (canvasHeight > containerHeight) {
          canvasHeight = containerHeight;
          canvasWidth = canvasHeight * imageAspectRatio;
        }

        setCanvasDimensions({ width: canvasWidth, height: canvasHeight });
      }
    };
  }, [mockup.mockup_image_url]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (mockupImage) {
        const container = document.getElementById('canvas-container');
        if (container) {
          const containerWidth = container.clientWidth - 64; // Account for padding
          const containerHeight = container.clientHeight - 64; // Account for padding
          const imageAspectRatio = mockupImage.width / mockupImage.height;

          let canvasWidth = containerWidth;
          let canvasHeight = canvasWidth / imageAspectRatio;

          // If height is too tall, constrain by height instead
          if (canvasHeight > containerHeight) {
            canvasHeight = containerHeight;
            canvasWidth = canvasHeight * imageAspectRatio;
          }

          setCanvasDimensions({ width: canvasWidth, height: canvasHeight });
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mockupImage]);

  // Export functionality
  useEffect(() => {
    const handleExport = (e: any) => {
      const { includeAnnotations } = e.detail;
      exportMockup(includeAnnotations);
    };

    window.addEventListener('export-mockup', handleExport);
    return () => window.removeEventListener('export-mockup', handleExport);
  }, [comments]);

  const exportMockup = (includeAnnotations: boolean) => {
    if (!stageRef.current) return;

    const stage = stageRef.current;

    // Save current scale and position
    const currentScale = stage.scaleX();
    const currentPosition = stage.position();

    // Reset to original scale for export
    stage.scale({ x: 1, y: 1 });
    stage.position({ x: 0, y: 0 });

    // Hide or show annotation layer based on option
    const annotationLayer = stage.findOne('.annotation-layer');
    if (annotationLayer && !includeAnnotations) {
      annotationLayer.hide();
    }

    // Export as high-res image
    const dataURL = stage.toDataURL({
      pixelRatio: 2,
      mimeType: 'image/png'
    });

    // Show annotation layer again
    if (annotationLayer && !includeAnnotations) {
      annotationLayer.show();
    }

    // Restore original scale and position
    stage.scale({ x: currentScale, y: currentScale });
    stage.position(currentPosition);

    // Trigger download
    const link = document.createElement('a');
    link.download = `${mockup.mockup_name}${includeAnnotations ? '-annotated' : ''}.png`;
    link.href = dataURL;
    link.click();
  };

  // Reset zoom and pan (called from toolbar via parent)
  const handleResetZoom = () => {
    onScaleChange(1.0);
    setStagePosition({ x: 0, y: 0 });
  };

  const handleFitToScreen = () => {
    if (!mockupImage) return;

    const container = document.getElementById('canvas-container');
    if (!container) return;

    const containerWidth = container.clientWidth - 64;
    const containerHeight = container.clientHeight - 64;
    const imageAspectRatio = mockupImage.width / mockupImage.height;

    let fitWidth = containerWidth;
    let fitHeight = fitWidth / imageAspectRatio;

    if (fitHeight > containerHeight) {
      fitHeight = containerHeight;
      fitWidth = fitHeight * imageAspectRatio;
    }

    const scaleToFit = fitWidth / canvasDimensions.width;
    onScaleChange(scaleToFit);
    setStagePosition({ x: 0, y: 0 });
  };

  const handleWheel = (e: any) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Calculate new scale
    const scaleBy = 1.1;
    const newScale = e.evt.deltaY < 0
      ? Math.min(oldScale * scaleBy, MAX_SCALE)
      : Math.max(oldScale / scaleBy, MIN_SCALE);

    // Calculate new position to zoom toward mouse cursor
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    onScaleChange(newScale);
    setStagePosition(newPos);
  };

  const handleMouseDown = (e: any) => {
    const stage = e.target.getStage();
    // Use getRelativePointerPosition if available, otherwise transform manually
    let stagePos;
    let pointerPos;
    if (typeof stage.getRelativePointerPosition === 'function') {
      const pos = stage.getRelativePointerPosition();
      stagePos = pos || { x: 0, y: 0 };
      pointerPos = stage.getPointerPosition(); // Still need for panning
    } else {
      pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;
      // Transform pointer position to stage coordinates (accounting for scale and position)
      stagePos = {
        x: (pointerPos.x - stagePosition.x) / scale,
        y: (pointerPos.y - stagePosition.y) / scale
      };
    }

    // Handle panning with select tool
    if (activeTool === 'select') {
      if (!pointerPos) return;
      setIsPanning(true);
      setLastPanPosition({ x: pointerPos.x, y: pointerPos.y });
      return;
    }

    // Only allow drawing if user can annotate (creator OR reviewer)
    if (!canAnnotate) return;

    setIsDrawing(true);

    // Handle different tools
    switch (activeTool) {
      case 'pin':
        // Place pin and immediately show comment dialog
        setCommentPosition({ x: stagePos.x, y: stagePos.y });
        setPendingAnnotationData({
          type: 'pin',
          position_x: (stagePos.x / canvasDimensions.width) * 100,
          position_y: (stagePos.y / canvasDimensions.height) * 100,
          annotation_color: strokeColor
        });
        setShowCommentDialog(true);
        setIsDrawing(false);
        break;

      case 'arrow':
        setCurrentShape({
          type: 'arrow',
          points: [stagePos.x, stagePos.y, stagePos.x, stagePos.y],
          stroke: strokeColor,
          strokeWidth,
          pointerLength: 10,
          pointerWidth: 10
        });
        break;

      case 'circle':
        setCurrentShape({
          type: 'circle',
          x: stagePos.x,
          y: stagePos.y,
          radius: 0,
          stroke: strokeColor,
          strokeWidth
        });
        break;

      case 'rect':
        setCurrentShape({
          type: 'rect',
          x: stagePos.x,
          y: stagePos.y,
          width: 0,
          height: 0,
          stroke: strokeColor,
          strokeWidth
        });
        break;

      case 'freehand':
        setCurrentShape({
          type: 'freehand',
          points: [stagePos.x, stagePos.y],
          stroke: strokeColor,
          strokeWidth
        });
        break;

      case 'text':
        setCommentPosition({ x: stagePos.x, y: stagePos.y });
        setPendingAnnotationData({
          type: 'text',
          x: stagePos.x,
          y: stagePos.y,
          text: '',
          fontSize: 16,
          fill: strokeColor
        });
        setShowCommentDialog(true);
        setIsDrawing(false);
        break;
    }
  };

  const handleMouseMove = (e: any) => {
    const stage = e.target.getStage();
    // Use getRelativePointerPosition if available, otherwise transform manually
    let stagePos;
    let pointerPos;
    if (typeof stage.getRelativePointerPosition === 'function') {
      const pos = stage.getRelativePointerPosition();
      stagePos = pos || { x: 0, y: 0 };
      pointerPos = stage.getPointerPosition(); // Still need for panning
    } else {
      pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;
      // Transform pointer position to stage coordinates (accounting for scale and position)
      stagePos = {
        x: (pointerPos.x - stagePosition.x) / scale,
        y: (pointerPos.y - stagePosition.y) / scale
      };
    }

    // Handle panning
    if (isPanning && activeTool === 'select') {
      const dx = pointerPos.x - lastPanPosition.x;
      const dy = pointerPos.y - lastPanPosition.y;

      setStagePosition(prev => ({
        x: prev.x + dx,
        y: prev.y + dy
      }));

      setLastPanPosition({ x: pointerPos.x, y: pointerPos.y });
      return;
    }

    if (!isDrawing || !currentShape) return;

    // Update current shape based on tool
    switch (activeTool) {
      case 'arrow':
        setCurrentShape({
          ...currentShape,
          points: [
            currentShape.points[0],
            currentShape.points[1],
            stagePos.x,
            stagePos.y
          ]
        });
        break;

      case 'circle':
        const radiusX = Math.abs(stagePos.x - currentShape.x);
        const radiusY = Math.abs(stagePos.y - currentShape.y);
        const radius = Math.sqrt(radiusX * radiusX + radiusY * radiusY);
        setCurrentShape({
          ...currentShape,
          radius
        });
        break;

      case 'rect':
        setCurrentShape({
          ...currentShape,
          width: stagePos.x - currentShape.x,
          height: stagePos.y - currentShape.y
        });
        break;

      case 'freehand':
        setCurrentShape({
          ...currentShape,
          points: [...currentShape.points, stagePos.x, stagePos.y]
        });
        break;
    }
  };

  const handleMouseUp = () => {
    // Stop panning
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (!isDrawing || !currentShape) return;

    setIsDrawing(false);

    // Show comment dialog with annotation data
    const centerX = activeTool === 'arrow'
      ? (currentShape.points[0] + currentShape.points[2]) / 2
      : currentShape.x || 0;
    const centerY = activeTool === 'arrow'
      ? (currentShape.points[1] + currentShape.points[3]) / 2
      : currentShape.y || 0;

    setCommentPosition({ x: centerX, y: centerY });
    setPendingAnnotationData(currentShape);
    setShowCommentDialog(true);
  };

  const handleCommentSubmit = async () => {
    if (!commentText.trim() || !pendingAnnotationData) return;

    try {
      // Calculate position percentages
      const position_x = activeTool === 'pin'
        ? pendingAnnotationData.position_x
        : (commentPosition.x / canvasDimensions.width) * 100;
      const position_y = activeTool === 'pin'
        ? pendingAnnotationData.position_y
        : (commentPosition.y / canvasDimensions.height) * 100;

      const response = await fetch(`/api/mockups/${mockup.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment_text: commentText,
          annotation_data: pendingAnnotationData,
          position_x,
          position_y,
          annotation_type: activeTool,
          annotation_color: strokeColor
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || 'Failed to create comment';
        console.error('Comment creation failed:', {
          status: response.status,
          error: errorMessage,
          response: errorData
        });
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Comment created successfully:', result);

      // Reset state
      setCommentText('');
      setCurrentShape(null);
      setPendingAnnotationData(null);
      setShowCommentDialog(false);

      // Trigger refetch of comments
      onCommentCreate();
    } catch (error) {
      console.error('Error creating comment:', error);
      alert(error instanceof Error ? error.message : 'Failed to create comment');
    }
  };

  // Handle dragging annotations to new positions
  const handleAnnotationDrag = async (commentId: string, e: any) => {
    const node = e.target;
    const comment = comments.find(c => c.id === commentId);
    if (!comment?.annotation_data) return;

    // Calculate delta movement
    const deltaX = node.x();
    const deltaY = node.y();

    // Update annotation_data based on type
    let updatedData = { ...comment.annotation_data };
    let updatedPositionX = comment.position_x;
    let updatedPositionY = comment.position_y;

    switch (comment.annotation_type) {
      case 'arrow':
        updatedData.points = [
          updatedData.points[0] + deltaX,
          updatedData.points[1] + deltaY,
          updatedData.points[2] + deltaX,
          updatedData.points[3] + deltaY
        ];
        break;
      case 'circle':
      case 'rect':
      case 'text':
        updatedData.x += deltaX;
        updatedData.y += deltaY;
        break;
      case 'freehand':
        updatedData.points = updatedData.points.map((val: number, i: number) =>
          i % 2 === 0 ? val + deltaX : val + deltaY
        );
        break;
      case 'pin':
        const currentX = (comment.position_x! / 100) * canvasDimensions.width;
        const currentY = (comment.position_y! / 100) * canvasDimensions.height;
        updatedPositionX = ((currentX + deltaX) / canvasDimensions.width) * 100;
        updatedPositionY = ((currentY + deltaY) / canvasDimensions.height) * 100;
        break;
    }

    // Reset group position to prevent accumulation
    node.position({ x: 0, y: 0 });

    // Update via API
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          annotation_data: updatedData,
          position_x: updatedPositionX,
          position_y: updatedPositionY
        })
      });

      if (!response.ok) throw new Error('Failed to update annotation position');

      // Refresh comments to show updated position
      onCommentCreate();
    } catch (error) {
      console.error('Failed to update annotation position:', error);
      alert('Failed to move annotation. Please try again.');
    }
  };

  // Render annotation from comment data
  const renderAnnotation = (comment: Comment, index: number) => {
    if (!comment.annotation_data) return null;

    // Skip resolved comments unless being hovered in sidebar
    if (comment.is_resolved && hoveredCommentId !== comment.id) {
      return null;
    }

    const data = comment.annotation_data;
    const key = `annotation-${comment.id}`;
    const isHovered = hoveredCommentId === comment.id;

    // Calculate center position for badge based on annotation type
    let badgeX = 0;
    let badgeY = 0;

    switch (comment.annotation_type) {
      case 'arrow':
        badgeX = (data.points[0] + data.points[2]) / 2;
        badgeY = (data.points[1] + data.points[3]) / 2;
        break;
      case 'circle':
      case 'rect':
        badgeX = data.x;
        badgeY = data.y;
        break;
      case 'freehand':
        // Use first point
        badgeX = data.points[0];
        badgeY = data.points[1];
        break;
      case 'text':
        badgeX = data.x;
        badgeY = data.y;
        break;
      case 'pin':
        badgeX = (comment.position_x! / 100) * canvasDimensions.width;
        badgeY = (comment.position_y! / 100) * canvasDimensions.height;
        break;
    }

    // Determine if this annotation is draggable (select tool + user is creator)
    const isDraggable = activeTool === 'select' && comment.user_id === user?.id;

    return (
      <Group
        key={`group-${comment.id}`}
        draggable={isDraggable}
        onDragEnd={(e) => handleAnnotationDrag(comment.id, e)}
        onClick={() => setSelectedAnnotation(comment.id)}
        onTap={() => setSelectedAnnotation(comment.id)}
        cursor={isDraggable ? 'move' : 'default'}
      >
        {/* Main annotation */}
        {comment.annotation_type === 'arrow' && (
          <Arrow
            key={key}
            points={data.points}
            stroke={comment.annotation_color || '#FF6B6B'}
            strokeWidth={isHovered ? (data.strokeWidth || 3) + 2 : (data.strokeWidth || 3)}
            pointerLength={data.pointerLength || 10}
            pointerWidth={data.pointerWidth || 10}
            opacity={isHovered ? 1 : 0.9}
            onMouseEnter={() => onCommentHover(comment.id)}
            onMouseLeave={() => onCommentHover(null)}
          />
        )}

        {comment.annotation_type === 'circle' && (
          <Circle
            key={key}
            x={data.x}
            y={data.y}
            radius={data.radius}
            stroke={comment.annotation_color || '#FF6B6B'}
            strokeWidth={isHovered ? (data.strokeWidth || 3) + 2 : (data.strokeWidth || 3)}
            opacity={isHovered ? 1 : 0.9}
            onMouseEnter={() => onCommentHover(comment.id)}
            onMouseLeave={() => onCommentHover(null)}
          />
        )}

        {comment.annotation_type === 'rect' && (
          <Rect
            key={key}
            x={data.x}
            y={data.y}
            width={data.width}
            height={data.height}
            stroke={comment.annotation_color || '#FF6B6B'}
            strokeWidth={isHovered ? (data.strokeWidth || 3) + 2 : (data.strokeWidth || 3)}
            opacity={isHovered ? 1 : 0.9}
            onMouseEnter={() => onCommentHover(comment.id)}
            onMouseLeave={() => onCommentHover(null)}
          />
        )}

        {comment.annotation_type === 'freehand' && (
          <Line
            key={key}
            points={data.points}
            stroke={comment.annotation_color || '#FF6B6B'}
            strokeWidth={isHovered ? (data.strokeWidth || 3) + 2 : (data.strokeWidth || 3)}
            tension={0.5}
            lineCap="round"
            lineJoin="round"
            opacity={isHovered ? 1 : 0.9}
            onMouseEnter={() => onCommentHover(comment.id)}
            onMouseLeave={() => onCommentHover(null)}
          />
        )}

        {comment.annotation_type === 'text' && (
          <Text
            key={key}
            x={data.x}
            y={data.y}
            text={data.text || comment.comment_text}
            fontSize={data.fontSize || 16}
            fill={comment.annotation_color || '#FF6B6B'}
            fontFamily="Arial"
            opacity={isHovered ? 1 : 0.9}
            onMouseEnter={() => onCommentHover(comment.id)}
            onMouseLeave={() => onCommentHover(null)}
          />
        )}

        {comment.annotation_type === 'pin' && (
          <Circle
            key={key}
            x={badgeX}
            y={badgeY}
            radius={isHovered ? 10 : 8}
            fill={comment.annotation_color || '#FF6B6B'}
            stroke="white"
            strokeWidth={2}
            opacity={isHovered ? 1 : 0.9}
            onMouseEnter={() => onCommentHover(comment.id)}
            onMouseLeave={() => onCommentHover(null)}
          />
        )}

        {/* Numbered badge */}
        <Circle
          key={`badge-circle-${comment.id}`}
          x={badgeX}
          y={badgeY - 25}
          radius={isHovered ? 14 : 12}
          fill="white"
          stroke={comment.annotation_color || '#FF6B6B'}
          strokeWidth={2}
          shadowColor="black"
          shadowBlur={4}
          shadowOpacity={0.2}
          onMouseEnter={() => onCommentHover(comment.id)}
          onMouseLeave={() => onCommentHover(null)}
        />
        <Text
          key={`badge-text-${comment.id}`}
          x={badgeX}
          y={badgeY - 25}
          text={String(index + 1)}
          fontSize={isHovered ? 15 : 13}
          fontStyle="bold"
          fill={comment.annotation_color || '#FF6B6B'}
          align="center"
          verticalAlign="middle"
          offsetX={isHovered ? 4 : 3.5}
          offsetY={isHovered ? 7.5 : 6.5}
          onMouseEnter={() => onCommentHover(comment.id)}
          onMouseLeave={() => onCommentHover(null)}
        />

        {/* Hover highlight effect */}
        {isHovered && (
          <Circle
            key={`highlight-${comment.id}`}
            x={badgeX}
            y={badgeY}
            radius={30}
            stroke={comment.annotation_color || '#FF6B6B'}
            strokeWidth={3}
            opacity={0.3}
            dash={[10, 5]}
          />
        )}
      </Group>
    );
  };

  if (!mockupImage) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading mockup...</p>
      </div>
    );
  }

  return (
    <div id="canvas-container" className="flex items-center justify-center h-full w-full p-8 relative">
      <Stage
        ref={stageRef}
        width={canvasDimensions.width}
        height={canvasDimensions.height}
        scaleX={scale}
        scaleY={scale}
        x={stagePosition.x}
        y={stagePosition.y}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: activeTool === 'select' ? (isPanning ? 'grabbing' : 'grab') : 'crosshair' }}
      >
        {/* Background Layer - Mockup Image */}
        <Layer>
          <KonvaImage
            image={mockupImage}
            width={canvasDimensions.width}
            height={canvasDimensions.height}
          />
        </Layer>

        {/* Annotation Layer - Saved Annotations */}
        <Layer name="annotation-layer">
          {comments.map((comment, index) => renderAnnotation(comment, index))}
        </Layer>

        {/* Active Drawing Layer */}
        <Layer>
          {currentShape && (
            <>
              {currentShape.type === 'arrow' && (
                <Arrow {...currentShape} />
              )}
              {currentShape.type === 'circle' && (
                <Circle {...currentShape} fill="transparent" />
              )}
              {currentShape.type === 'rect' && (
                <Rect {...currentShape} fill="transparent" />
              )}
              {currentShape.type === 'freehand' && (
                <Line
                  {...currentShape}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                />
              )}
            </>
          )}
        </Layer>
      </Stage>

      {/* Comment Dialog */}
      {showCommentDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Add Comment</h3>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Enter your comment..."
              className="w-full border border-gray-300 rounded-lg p-3 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowCommentDialog(false);
                  setCommentText('');
                  setCurrentShape(null);
                  setPendingAnnotationData(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCommentSubmit}
                disabled={!commentText.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add Comment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
