'use client';

import { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  TrendingUp, 
  Target, 
  Activity, 
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

interface AutonomousGrowthLoopProps {
  userId: string;
}

interface LoopData {
  id: string;
  goal: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
  currentCycle: number;
  totalReached: number;
  conversionRate: number;
  engagementRate: number;
  createdAt: string;
  updatedAt: string;
}

const AutonomousGrowthLoop = ({ userId }: AutonomousGrowthLoopProps) => {
  const [loops, setLoops] = useState<LoopData[]>([]);
  const [newGoal, setNewGoal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLoop, setSelectedLoop] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Î£®ÌîÑ Î™©Î°ù Í∞Ä?∏Ïò§Í∏?  useEffect(() => {
    fetchLoops();
  }, []);

  const fetchLoops = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/autonomous-growth?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setLoops(data);
      } else {
        setError('Î£®ÌîÑ Î™©Î°ù??Î∂àÎü¨?§Îäî???§Ìå®?àÏäµ?àÎã§.');
      }
    } catch {
      setError('Î£®ÌîÑ Î™©Î°ù??Î∂àÎü¨?§Îäî???§Ìå®?àÏäµ?àÎã§.');
    } finally {
      setIsLoading(false);
    }
  };

  const createLoop = async () => {
    if (!newGoal.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/autonomous-growth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: newGoal, userId }),
      });

      if (response.ok) {
        const newLoop = await response.json();
        setLoops([...loops, newLoop]);
        setNewGoal('');
        fetchLoops(); // Î™©Î°ù Í∞±Ïã†
      } else {
        setError('Î£®ÌîÑ ?ùÏÑ±???§Ìå®?àÏäµ?àÎã§.');
      }
    } catch {
      setError('Î£®ÌîÑ ?ùÏÑ±???§Ìå®?àÏäµ?àÎã§.');
    } finally {
      setIsLoading(false);
    }
  };

  const manageLoop = async (loopId: string, action: 'start' | 'pause' | 'stop') => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/autonomous-growth', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loopId, action }),
      });

      if (response.ok) {
        fetchLoops(); // ?ÅÌÉú Í∞±Ïã†
      } else {
        setError(`Î£®ÌîÑ ${action} ?ëÏóÖ???§Ìå®?àÏäµ?àÎã§.`);
      }
    } catch {
      setError(`Î£®ÌîÑ ${action} ?ëÏóÖ???§Ìå®?àÏäµ?àÎã§.`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Activity className="h-4 w-4 text-green-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-500/10 text-green-600';
      case 'completed':
        return 'bg-blue-500/10 text-blue-600';
      case 'failed':
        return 'bg-red-500/10 text-red-600';
      case 'paused':
        return 'bg-yellow-500/10 text-yellow-600';
      default:
        return 'bg-gray-500/10 text-gray-600';
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-indigo-600" />
          ?êÏú® ?±Ïû• Î£®ÌîÑ
        </h2>
      </div>

      <div className="mb-6 p-4 bg-indigo-50 rounded-lg">
        <h3 className="font-medium text-indigo-900 mb-2">?àÎ°ú??Î£®ÌîÑ ?ùÏÑ±</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newGoal}
            onChange={(e) => setNewGoal(e.target.value)}
            placeholder="?? '?åÏõê 1000Î™?ÎßåÎì§Í∏?"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onKeyDown={(e) => e.key === 'Enter' && createLoop()}
          />
          <button
            onClick={createLoop}
            disabled={isLoading || !newGoal.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Target className="h-4 w-4" />
            ?ùÏÑ±
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!isLoading && loops.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          ?ùÏÑ±???êÏú® ?±Ïû• Î£®ÌîÑÍ∞Ä ?ÜÏäµ?àÎã§.
        </div>
      ) : (
        <div className="space-y-4">
          {loops.map((loop) => (
            <div 
              key={loop.id} 
              className={`p-4 rounded-lg border ${
                selectedLoop === loop.id 
                  ? 'border-indigo-500 bg-indigo-50' 
                  : 'border-gray-200 bg-white'
              } transition-all duration-200`}
              onClick={() => setSelectedLoop(loop.id === selectedLoop ? null : loop.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(loop.status)}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(loop.status)}`}>
                      {loop.status === 'running' ? '?§Ìñâ Ï§? : 
                       loop.status === 'completed' ? '?ÑÎ£å?? : 
                       loop.status === 'failed' ? '?§Ìå®' : 
                       loop.status === 'paused' ? '?ºÏãú ?ïÏ?' : '?ÄÍ∏?Ï§?}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{loop.goal}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">?ÑÎã¨: {loop.totalReached}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">?¨Ïù¥?? {loop.currentCycle}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">?ÑÌôò: {loop.conversionRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Activity className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Ï∞∏Ïó¨: {loop.engagementRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  {loop.status === 'running' ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        manageLoop(loop.id, 'pause');
                      }}
                      className="p-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-md"
                    >
                      <Pause className="h-4 w-4" />
                    </button>
                  ) : loop.status === 'paused' ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        manageLoop(loop.id, 'start');
                      }}
                      className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-md"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        manageLoop(loop.id, 'start');
                      }}
                      className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-md"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      manageLoop(loop.id, 'stop');
                    }}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md"
                  >
                    <Square className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fetchLoops();
                    }}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-md"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              {selectedLoop === loop.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p><strong>?ùÏÑ±??</strong> {new Date(loop.createdAt).toLocaleString()}</p>
                      <p><strong>?ÖÎç∞?¥Ìä∏:</strong> {new Date(loop.updatedAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <p><strong>Î™©Ìëú:</strong> {loop.goal}</p>
                      <p><strong>?ÅÌÉú:</strong> {loop.status}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AutonomousGrowthLoop;
