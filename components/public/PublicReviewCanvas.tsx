'use client';

import { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Image as KonvaImage, Arrow, Circle, Rect, Line, Text, Group } from 'react-konva';
import Konva from 'konva';
import { MessageSquare, CheckCircle, XCircle } from 'lucide-react';

interface AssetData {
  id: string;
  mockup_name: string;
  mockup_image_url: string;
  created_at: string;
}

interface ShareLinkData {
  id: string;
  assetId: string;
  permissions: 'view' | 'comment' | 'approve';
  identityRequiredLevel: 'none' | 'comment' | 'approve';
  hasPassword: boolean;
  expiresAt: string | null;
  maxUses: number | null;
  useCount: number;
}

interface ReviewerSession {
  id: string;
  email?: string;
  name?: string;
}

interface PublicReviewCanvasProps {
  asset: AssetData;
  shareLink: ShareLinkData;
  token: string;
  reviewerSession: ReviewerSession | null;
  onIdentityRequired: (action: 'comment' | 'approve') => boolean;
  onToast: (message: string, type: 'success' | 'error') => void;
}

export default function PublicReviewCanvas({
  asset,
  shareLink,
  token,
  reviewerSession,
  onIdentityRequired,
  onToast,
}: PublicReviewCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const [mockupImage, setMockupImage] = useState<HTMLImageElement | null>(null);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1.0);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPosition, setLastPanPosition] = useState({ x: 0, y: 0 });
  
  // Drawing state
  const [activeTool, setActiveTool] = useState<'select' | 'pin' | 'arrow' | 'circle' | 'rect' | 'freehand' | 'text'>('select');
  const [strokeColor, setStrokeColor] = useState('#22C55E');
  const [strokeWidth, setStrokeWidth] = useState(8);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentShape, setCurrentShape] = useState<any>(null);
  const [shapes, setShapes] = useState<any[]>([]);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [commentPosition, setCommentPosition] = useState({ x: 0, y: 0 });
  const [commentText, setCommentText] = useState('');
  const [pendingAnnotationData, setPendingAnnotationData] = useState<any>(null);
  
  // Comments state
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  
  // Approval state
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'changes_requested' | null>(null);
  
  // Load mockup image
  useEffect(() => {
    if (!asset.mockup_image_url) return;
    
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = asset.mockup_image_url;
    img.onload = () => {
      setMockupImage(img);
      
      const container = document.getElementById('canvas-container');
      if (container) {
        const containerWidth = container.clientWidth - 64;
        const containerHeight = container.clientHeight - 64;
        const imageAspectRatio = img.width / img.height;
        const containerAspectRatio = containerWidth / containerHeight;
        
        let width, height;
        if (imageAspectRatio > containerAspectRatio) {
          width = containerWidth;
          height = containerWidth / imageAspectRatio;
        } else {
          height = containerHeight;
          width = containerHeight * imageAspectRatio;
        }
        
        setCanvasDimensions({ width, height });
      }
    };
  }, [asset.mockup_image_url]);
  
  // Load comments
  useEffect(() => {
    const loadComments = async () => {
      try {
        // For public share, we'll need to fetch comments via the public API
        // For now, we'll use a simplified approach
        setLoadingComments(false);
      } catch (err) {
        onToast('Failed to load comments', 'error');
        setLoadingComments(false);
      }
    };
    
    if (shareLink.permissions !== 'view') {
      loadComments();
    }
  }, [shareLink.permissions, token, onToast]);
  
  // Handle tool selection
  const handleToolSelect = (tool: typeof activeTool) => {
    if (shareLink.permissions === 'view') {
      onToast('View-only mode. Cannot annotate.', 'error');
      return;
    }
    
    if (!onIdentityRequired('comment')) {
      return;
    }
    
    setActiveTool(tool);
  };
  
  // Handle stage events
  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (activeTool === 'select' || shareLink.permissions === 'view') {
      setIsPanning(true);
      const stage = e.target.getStage();
      if (stage) {
        setLastPanPosition({
          x: stage.getPointerPosition()?.x || 0,
          y: stage.getPointerPosition()?.y || 0,
        });
      }
      return;
    }
    
    if (!onIdentityRequired('comment')) {
      return;
    }
    
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;
    
    const relativePos = {
      x: (pointerPos.x - stagePosition.x) / scale,
      y: (pointerPos.y - stagePosition.y) / scale,
    };
    
    setIsDrawing(true);
    
    if (activeTool === 'pin') {
      setCurrentShape({
        type: 'pin',
        x: relativePos.x,
        y: relativePos.y,
        color: strokeColor,
      });
      setCommentPosition(relativePos);
      setShowCommentDialog(true);
    } else if (activeTool === 'arrow') {
      setCurrentShape({
        type: 'arrow',
        points: [relativePos.x, relativePos.y, relativePos.x, relativePos.y],
        color: strokeColor,
        strokeWidth,
      });
    } else if (activeTool === 'circle') {
      setCurrentShape({
        type: 'circle',
        x: relativePos.x,
        y: relativePos.y,
        radius: 0,
        color: strokeColor,
        strokeWidth,
      });
    } else if (activeTool === 'rect') {
      setCurrentShape({
        type: 'rect',
        x: relativePos.x,
        y: relativePos.y,
        width: 0,
        height: 0,
        color: strokeColor,
        strokeWidth,
      });
    } else if (activeTool === 'freehand') {
      setCurrentShape({
        type: 'freehand',
        points: [relativePos.x, relativePos.y],
        color: strokeColor,
        strokeWidth,
      });
    } else if (activeTool === 'text') {
      setCurrentShape({
        type: 'text',
        x: relativePos.x,
        y: relativePos.y,
        text: '',
        color: strokeColor,
        fontSize: 16,
      });
      setCommentPosition(relativePos);
      setShowCommentDialog(true);
    }
  };
  
  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isPanning && activeTool === 'select') {
      const stage = e.target.getStage();
      if (!stage) return;
      
      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;
      
      const dx = pointerPos.x - lastPanPosition.x;
      const dy = pointerPos.y - lastPanPosition.y;
      
      setStagePosition({
        x: stagePosition.x + dx,
        y: stagePosition.y + dy,
      });
      
      setLastPanPosition(pointerPos);
      return;
    }
    
    if (!isDrawing || !currentShape) return;
    
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;
    
    const relativePos = {
      x: (pointerPos.x - stagePosition.x) / scale,
      y: (pointerPos.y - stagePosition.y) / scale,
    };
    
    if (currentShape.type === 'arrow') {
      setCurrentShape({
        ...currentShape,
        points: [currentShape.points[0], currentShape.points[1], relativePos.x, relativePos.y],
      });
    } else if (currentShape.type === 'circle') {
      const radius = Math.sqrt(
        Math.pow(relativePos.x - currentShape.x, 2) + Math.pow(relativePos.y - currentShape.y, 2)
      );
      setCurrentShape({ ...currentShape, radius });
    } else if (currentShape.type === 'rect') {
      setCurrentShape({
        ...currentShape,
        width: relativePos.x - currentShape.x,
        height: relativePos.y - currentShape.y,
      });
    } else if (currentShape.type === 'freehand') {
      setCurrentShape({
        ...currentShape,
        points: [...currentShape.points, relativePos.x, relativePos.y],
      });
    }
  };
  
  const handleStageMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    
    if (isDrawing && currentShape && (currentShape.type === 'arrow' || currentShape.type === 'circle' || currentShape.type === 'rect' || currentShape.type === 'freehand')) {
      setShapes([...shapes, currentShape]);
      setPendingAnnotationData(currentShape);
      if (currentShape.type !== 'freehand') {
        setShowCommentDialog(true);
      } else {
        // For freehand, auto-create comment
        handleCommentSubmit('');
      }
      setCurrentShape(null);
    }
    
    setIsDrawing(false);
  };
  
  const handleCommentSubmit = async (text: string) => {
    if (!pendingAnnotationData && !showCommentDialog) return;
    
    const annotationData = pendingAnnotationData || currentShape;
    if (!annotationData) return;
    
    try {
      const response = await fetch(`/api/public/share/${token}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentText: text || 'Annotation',
          annotationData,
          positionX: annotationData.x || (annotationData.points?.[0] / canvasDimensions.width) * 100,
          positionY: annotationData.y || (annotationData.points?.[1] / canvasDimensions.height) * 100,
          annotationType: annotationData.type,
          annotationColor: annotationData.color || strokeColor,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        onToast(data.error || 'Failed to create comment', 'error');
        return;
      }
      
      setShapes([...shapes, annotationData]);
      setShowCommentDialog(false);
      setCommentText('');
      setPendingAnnotationData(null);
      setCurrentShape(null);
      setActiveTool('select');
      onToast('Comment created successfully', 'success');
    } catch (err) {
      onToast('Failed to create comment', 'error');
    }
  };
  
  const handleApprove = async (status: 'approved' | 'changes_requested', notes?: string) => {
    if (!onIdentityRequired('approve')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/public/share/${token}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        onToast(data.error || 'Failed to submit approval', 'error');
        return;
      }
      
      setApprovalStatus(status);
      onToast(status === 'approved' ? 'Approved successfully' : 'Changes requested', 'success');
    } catch (err) {
      onToast('Failed to submit approval', 'error');
    }
  };
  
  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      {/* Toolbar */}
      {shareLink.permissions !== 'view' && (
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2">
          <button
            onClick={() => handleToolSelect('select')}
            className={`px-3 py-1 rounded ${activeTool === 'select' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            Select
          </button>
          <button
            onClick={() => handleToolSelect('pin')}
            className={`px-3 py-1 rounded ${activeTool === 'pin' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            Pin
          </button>
          <button
            onClick={() => handleToolSelect('arrow')}
            className={`px-3 py-1 rounded ${activeTool === 'arrow' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            Arrow
          </button>
          <button
            onClick={() => handleToolSelect('circle')}
            className={`px-3 py-1 rounded ${activeTool === 'circle' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            Circle
          </button>
          <button
            onClick={() => handleToolSelect('rect')}
            className={`px-3 py-1 rounded ${activeTool === 'rect' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            Rectangle
          </button>
          <div className="flex-1" />
          {shareLink.permissions === 'approve' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleApprove('approved')}
                disabled={approvalStatus === 'approved'}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Approve
              </button>
              <button
                onClick={() => handleApprove('changes_requested')}
                disabled={approvalStatus === 'changes_requested'}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                <XCircle className="h-4 w-4" />
                Request Changes
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Canvas */}
      <div id="canvas-container" className="flex-1 bg-gray-100 overflow-hidden">
        {mockupImage && (
          <Stage
            ref={stageRef}
            width={canvasDimensions.width}
            height={canvasDimensions.height}
            scaleX={scale}
            scaleY={scale}
            x={stagePosition.x}
            y={stagePosition.y}
            onMouseDown={handleStageMouseDown}
            onMouseMove={handleStageMouseMove}
            onMouseUp={handleStageMouseUp}
            style={{ cursor: activeTool === 'select' ? 'grab' : 'crosshair' }}
          >
            <Layer>
              <KonvaImage
                image={mockupImage}
                width={canvasDimensions.width}
                height={canvasDimensions.height}
              />
              
              {/* Render existing shapes */}
              {shapes.map((shape, index) => {
                if (shape.type === 'arrow') {
                  return (
                    <Arrow
                      key={index}
                      points={shape.points}
                      stroke={shape.color}
                      strokeWidth={shape.strokeWidth}
                    />
                  );
                } else if (shape.type === 'circle') {
                  return (
                    <Circle
                      key={index}
                      x={shape.x}
                      y={shape.y}
                      radius={shape.radius}
                      stroke={shape.color}
                      strokeWidth={shape.strokeWidth}
                    />
                  );
                } else if (shape.type === 'rect') {
                  return (
                    <Rect
                      key={index}
                      x={shape.x}
                      y={shape.y}
                      width={shape.width}
                      height={shape.height}
                      stroke={shape.color}
                      strokeWidth={shape.strokeWidth}
                    />
                  );
                } else if (shape.type === 'freehand') {
                  return (
                    <Line
                      key={index}
                      points={shape.points}
                      stroke={shape.color}
                      strokeWidth={shape.strokeWidth}
                      tension={0.5}
                      lineCap="round"
                      lineJoin="round"
                    />
                  );
                }
                return null;
              })}
              
              {/* Render current shape being drawn */}
              {currentShape && (
                <>
                  {currentShape.type === 'arrow' && (
                    <Arrow
                      points={currentShape.points}
                      stroke={currentShape.color}
                      strokeWidth={currentShape.strokeWidth}
                    />
                  )}
                  {currentShape.type === 'circle' && (
                    <Circle
                      x={currentShape.x}
                      y={currentShape.y}
                      radius={currentShape.radius}
                      stroke={currentShape.color}
                      strokeWidth={currentShape.strokeWidth}
                    />
                  )}
                  {currentShape.type === 'rect' && (
                    <Rect
                      x={currentShape.x}
                      y={currentShape.y}
                      width={currentShape.width}
                      height={currentShape.height}
                      stroke={currentShape.color}
                      strokeWidth={currentShape.strokeWidth}
                    />
                  )}
                  {currentShape.type === 'freehand' && (
                    <Line
                      points={currentShape.points}
                      stroke={currentShape.color}
                      strokeWidth={currentShape.strokeWidth}
                      tension={0.5}
                      lineCap="round"
                      lineJoin="round"
                    />
                  )}
                </>
              )}
            </Layer>
          </Stage>
        )}
      </div>
      
      {/* Comment Dialog */}
      {showCommentDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Add Comment</h2>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Enter your comment..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 min-h-[100px]"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowCommentDialog(false);
                  setCommentText('');
                  setPendingAnnotationData(null);
                  setCurrentShape(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCommentSubmit(commentText)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

