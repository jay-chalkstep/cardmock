'use client';

import React from 'react';
import { X, Check, AlertTriangle, AlertCircle, XCircle, Eye, Upload, ArrowRight } from 'lucide-react';

interface ScalingInfo {
  originalWidth: number;
  originalHeight: number;
  scaledWidth: number;
  scaledHeight: number;
  scaleFactor: number;
  qualityWarning: {
    level: 'success' | 'warning' | 'caution' | 'danger';
    message: string;
  };
}

interface TemplateUploadFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateName: string;
  templateUrl: string;
  scalingInfo: ScalingInfo;
  onContinue: () => void;
  onUploadDifferent: () => void;
}

/**
 * Modal that displays feedback after a template upload,
 * showing original dimensions, scaled dimensions, and quality warnings.
 */
const TemplateUploadFeedbackModal: React.FC<TemplateUploadFeedbackModalProps> = ({
  isOpen,
  onClose,
  templateName,
  templateUrl,
  scalingInfo,
  onContinue,
  onUploadDifferent,
}) => {
  if (!isOpen) return null;

  const { originalWidth, originalHeight, scaledWidth, scaledHeight, scaleFactor, qualityWarning } = scalingInfo;

  // Determine icon and colors based on warning level
  const getWarningStyles = () => {
    switch (qualityWarning.level) {
      case 'success':
        return {
          icon: <Check className="h-5 w-5" />,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-700',
          iconBg: 'bg-green-100',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="h-5 w-5" />,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-700',
          iconBg: 'bg-yellow-100',
        };
      case 'caution':
        return {
          icon: <AlertCircle className="h-5 w-5" />,
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          textColor: 'text-orange-700',
          iconBg: 'bg-orange-100',
        };
      case 'danger':
        return {
          icon: <XCircle className="h-5 w-5" />,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-700',
          iconBg: 'bg-red-100',
        };
    }
  };

  const styles = getWarningStyles();
  const isUpscaled = scaleFactor > 0;
  const scaleDirection = isUpscaled ? 'upscaled' : 'downscaled';
  const scalePercentage = Math.abs(scaleFactor).toFixed(1);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Template Uploaded</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Template Preview */}
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-3">
              <span className="font-medium">{templateName}</span>
            </p>
            <div className="relative inline-block border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <img
                src={templateUrl}
                alt={templateName}
                className="max-w-full h-auto max-h-48 object-contain"
              />
            </div>
          </div>

          {/* Dimension Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Dimensions</h4>
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Original</p>
                <p className="font-mono text-sm text-gray-700">
                  {originalWidth} × {originalHeight}px
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Scaled to</p>
                <p className="font-mono text-sm text-gray-900 font-medium">
                  {scaledWidth} × {scaledHeight}px
                </p>
                <p className="text-xs text-gray-500">(print resolution)</p>
              </div>
            </div>
            {scaleFactor !== 0 && (
              <p className="text-center text-xs text-gray-500 mt-2">
                Image was {scaleDirection} by {scalePercentage}%
              </p>
            )}
          </div>

          {/* Quality Warning */}
          <div className={`${styles.bgColor} ${styles.borderColor} border rounded-lg p-4`}>
            <div className="flex items-start gap-3">
              <div className={`${styles.iconBg} ${styles.textColor} p-2 rounded-full`}>
                {styles.icon}
              </div>
              <div>
                <p className={`font-medium ${styles.textColor}`}>
                  {qualityWarning.level === 'success' ? 'Quality Check Passed' : 'Quality Notice'}
                </p>
                <p className={`text-sm ${styles.textColor} opacity-90 mt-1`}>
                  {qualityWarning.message}
                </p>
                {qualityWarning.level === 'danger' && (
                  <p className="text-xs text-red-600 mt-2">
                    For best results, upload an image at least {scaledWidth}×{scaledHeight}px or larger.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={onUploadDifferent}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Upload Different Image
          </button>
          <button
            onClick={onContinue}
            className="flex items-center gap-2 px-6 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Check className="h-4 w-4" />
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateUploadFeedbackModal;
