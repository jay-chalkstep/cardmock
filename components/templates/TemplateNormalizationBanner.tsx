'use client';

import { Info, AlertTriangle, CheckCircle, Crop, Scale, AlertCircle } from 'lucide-react';
import { ClassificationResult, TemplateClassification, CR80_SPECS } from '@/lib/templateNormalization';

interface TemplateNormalizationBannerProps {
  classification: ClassificationResult;
  onAction: (action: string) => void;
  isProcessing?: boolean;
}

/**
 * Get the appropriate icon and colors for each classification type
 */
function getClassificationStyle(classification: TemplateClassification): {
  icon: React.ReactNode;
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
} {
  switch (classification) {
    case 'exact_300':
    case 'exact_600':
      return {
        icon: <CheckCircle className="h-5 w-5" />,
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        textColor: 'text-green-800',
        iconColor: 'text-green-500',
      };

    case 'correct_ratio_oversized':
    case 'correct_ratio_undersized':
      return {
        icon: <Scale className="h-5 w-5" />,
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-800',
        iconColor: 'text-blue-500',
      };

    case 'wrong_ratio':
      return {
        icon: <Crop className="h-5 w-5" />,
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        textColor: 'text-amber-800',
        iconColor: 'text-amber-500',
      };

    case 'too_small':
      return {
        icon: <AlertTriangle className="h-5 w-5" />,
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        textColor: 'text-orange-800',
        iconColor: 'text-orange-500',
      };

    case 'not_a_card':
      return {
        icon: <AlertCircle className="h-5 w-5" />,
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800',
        iconColor: 'text-red-500',
      };

    default:
      return {
        icon: <Info className="h-5 w-5" />,
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        textColor: 'text-gray-800',
        iconColor: 'text-gray-500',
      };
  }
}

/**
 * Get button styling based on variant
 */
function getButtonStyle(variant: 'primary' | 'secondary' | 'warning'): string {
  switch (variant) {
    case 'primary':
      return 'bg-blue-500 text-white hover:bg-blue-600';
    case 'warning':
      return 'bg-amber-500 text-white hover:bg-amber-600';
    case 'secondary':
    default:
      return 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50';
  }
}

export default function TemplateNormalizationBanner({
  classification,
  onAction,
  isProcessing = false,
}: TemplateNormalizationBannerProps) {
  const style = getClassificationStyle(classification.classification);
  const { width, height } = classification.originalDimensions;

  return (
    <div className={`${style.bgColor} ${style.borderColor} border rounded-lg p-4`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 ${style.iconColor}`}>{style.icon}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Dimensions badge */}
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm font-medium ${style.textColor}`}>
              {width} × {height}px
            </span>
            {classification.classification !== 'exact_300' && (
              <span className="text-xs text-gray-500">
                → {CR80_SPECS.DPI_300.width} × {CR80_SPECS.DPI_300.height}px
              </span>
            )}
          </div>

          {/* Message */}
          <p className={`text-sm ${style.textColor}`}>{classification.message}</p>

          {/* Quality warning if present */}
          {classification.qualityWarning && (
            <p className="text-sm text-orange-600 mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              {classification.qualityWarning}
            </p>
          )}

          {/* Crop info if present */}
          {classification.cropNeeded && (
            <p className="text-xs text-gray-500 mt-1">
              Crop: {classification.cropNeeded.amountPx}px from{' '}
              {classification.cropNeeded.direction === 'width' ? 'sides' : 'top/bottom'}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 mt-3">
            {classification.actionButtons.map((button, index) => (
              <button
                key={index}
                onClick={() => onAction(button.action)}
                disabled={isProcessing}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${getButtonStyle(button.variant)}`}
              >
                {button.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
