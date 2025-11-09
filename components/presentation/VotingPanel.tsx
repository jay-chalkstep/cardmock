'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Heart, Users } from 'lucide-react';

interface Vote {
  assetId: string;
  voteType: 'approve' | 'reject' | 'prefer';
  participantName: string;
  timestamp: string;
}

interface VotingPanelProps {
  assetId: string;
  sessionId: string;
  onVote: (voteType: 'approve' | 'reject' | 'prefer') => void;
  votes: Vote[];
  participantName: string;
}

export default function VotingPanel({
  assetId,
  sessionId,
  onVote,
  votes,
  participantName,
}: VotingPanelProps) {
  const [voting, setVoting] = useState(false);
  
  const handleVote = async (voteType: 'approve' | 'reject' | 'prefer') => {
    setVoting(true);
    try {
      await onVote(voteType);
    } finally {
      setVoting(false);
    }
  };
  
  const voteCounts = {
    approve: votes.filter((v) => v.voteType === 'approve').length,
    reject: votes.filter((v) => v.voteType === 'reject').length,
    prefer: votes.filter((v) => v.voteType === 'prefer').length,
  };
  
  const userVote = votes.find((v) => v.participantName === participantName);
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Users className="h-5 w-5" />
        Live Voting
      </h3>
      
      <div className="space-y-3">
        <button
          onClick={() => handleVote('approve')}
          disabled={voting || userVote?.voteType === 'approve'}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-colors ${
            userVote?.voteType === 'approve'
              ? 'border-green-600 bg-green-50 text-green-700'
              : 'border-gray-200 hover:border-green-500 text-gray-700'
          } disabled:opacity-50`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Approve</span>
          </div>
          <span className="text-sm font-semibold">{voteCounts.approve}</span>
        </button>
        
        <button
          onClick={() => handleVote('reject')}
          disabled={voting || userVote?.voteType === 'reject'}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-colors ${
            userVote?.voteType === 'reject'
              ? 'border-red-600 bg-red-50 text-red-700'
              : 'border-gray-200 hover:border-red-500 text-gray-700'
          } disabled:opacity-50`}
        >
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5" />
            <span className="font-medium">Request Changes</span>
          </div>
          <span className="text-sm font-semibold">{voteCounts.reject}</span>
        </button>
        
        <button
          onClick={() => handleVote('prefer')}
          disabled={voting || userVote?.voteType === 'prefer'}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-colors ${
            userVote?.voteType === 'prefer'
              ? 'border-purple-600 bg-purple-50 text-purple-700'
              : 'border-gray-200 hover:border-purple-500 text-gray-700'
          } disabled:opacity-50`}
        >
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            <span className="font-medium">Prefer This</span>
          </div>
          <span className="text-sm font-semibold">{voteCounts.prefer}</span>
        </button>
      </div>
      
      {userVote && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          You voted: <span className="font-medium capitalize">{userVote.voteType}</span>
        </div>
      )}
    </div>
  );
}

