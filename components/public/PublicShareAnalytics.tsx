'use client';

import { useState, useEffect } from 'react';
import { Eye, MessageSquare, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface ShareLinkAnalytics {
  linkId: string;
  totalViews: number;
  totalComments: number;
  totalApprovals: number;
  uniqueViewers: number;
  averageTimeSpent: number;
  actionsBreakdown: {
    view: number;
    comment: number;
    approve: number;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    timestamp: string;
    viewerIp?: string;
  }>;
}

interface PublicShareAnalyticsProps {
  linkId: string;
}

export default function PublicShareAnalytics({ linkId }: PublicShareAnalyticsProps) {
  const [analytics, setAnalytics] = useState<ShareLinkAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const response = await fetch(`/api/assets/share/${linkId}/analytics`);
        const data = await response.json();
        
        if (!response.ok) {
          setError(data.error || 'Failed to load analytics');
          setLoading(false);
          return;
        }
        
        setAnalytics(data.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load analytics');
        setLoading(false);
      }
    };
    
    if (linkId) {
      loadAnalytics();
    }
  }, [linkId]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }
  
  if (error || !analytics) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        {error || 'No analytics data available'}
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-600">Total Views</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{analytics.totalViews}</div>
          <div className="text-xs text-gray-500 mt-1">{analytics.uniqueViewers} unique viewers</div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-gray-600">Comments</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{analytics.totalComments}</div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-600">Approvals</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{analytics.totalApprovals}</div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-orange-600" />
            <span className="text-sm font-medium text-gray-600">Avg. Time</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {analytics.averageTimeSpent ? `${Math.round(analytics.averageTimeSpent / 60)}m` : 'N/A'}
          </div>
        </div>
      </div>
      
      {/* Actions Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions Breakdown</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Views</span>
            <span className="font-semibold text-gray-900">{analytics.actionsBreakdown.view}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Comments</span>
            <span className="font-semibold text-gray-900">{analytics.actionsBreakdown.comment}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Approvals</span>
            <span className="font-semibold text-gray-900">{analytics.actionsBreakdown.approve}</span>
          </div>
        </div>
      </div>
      
      {/* Recent Activity */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        {analytics.recentActivity.length > 0 ? (
          <div className="space-y-2">
            {analytics.recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-2">
                  {activity.action === 'view' && <Eye className="h-4 w-4 text-blue-600" />}
                  {activity.action === 'comment' && <MessageSquare className="h-4 w-4 text-green-600" />}
                  {activity.action === 'approve' && <CheckCircle className="h-4 w-4 text-purple-600" />}
                  <span className="text-sm text-gray-700 capitalize">{activity.action}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(activity.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No recent activity</p>
        )}
      </div>
    </div>
  );
}

