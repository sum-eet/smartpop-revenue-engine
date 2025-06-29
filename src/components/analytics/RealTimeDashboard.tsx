import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Users, 
  Eye, 
  MousePointer, 
  Clock, 
  TrendingUp, 
  Wifi, 
  WifiOff,
  Play,
  Pause
} from 'lucide-react';
import { WebSocketClient } from '@/lib/tracking/websocket-client';

interface RealTimeStats {
  activeUsers: number;
  pageViews: number;
  events: number;
  avgSessionDuration: number;
  topPages: Array<{ url: string; views: number }>;
  recentEvents: Array<{
    id: string;
    type: string;
    timestamp: Date;
    data: any;
  }>;
}

export const RealTimeDashboard: React.FC = () => {
  const [stats, setStats] = useState<RealTimeStats>({
    activeUsers: 0,
    pageViews: 0,
    events: 0,
    avgSessionDuration: 0,
    topPages: [],
    recentEvents: []
  });
  
  const [connected, setConnected] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const wsClient = useRef<WebSocketClient | null>(null);
  const statsInterval = useRef<number | null>(null);

  useEffect(() => {
    initializeWebSocket();
    
    return () => {
      cleanup();
    };
  }, []);

  const initializeWebSocket = async () => {
    try {
      const sessionId = getOrCreateSessionId();
      const wsUrl = `${process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:54321'}/functions/v1/websocket-stream`;
      
      wsClient.current = new WebSocketClient(wsUrl, sessionId, true);
      
      // Set up event listeners
      wsClient.current.on('connected', () => {
        setConnected(true);
        setConnectionError(null);
        if (streaming) {
          startRealTimeUpdates();
        }
      });

      wsClient.current.on('disconnected', () => {
        setConnected(false);
        stopRealTimeUpdates();
      });

      wsClient.current.on('error', (error: any) => {
        setConnectionError(error.message || 'WebSocket connection error');
      });

      wsClient.current.on('batch_processed', (data: any) => {
        updateStatsFromBatch(data);
      });

      wsClient.current.on('event', (data: any) => {
        updateStatsFromEvent(data);
      });

      // Connect
      await wsClient.current.connect();
      
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Failed to initialize WebSocket');
    }
  };

  const startStreaming = () => {
    setStreaming(true);
    if (connected) {
      startRealTimeUpdates();
    }
  };

  const stopStreaming = () => {
    setStreaming(false);
    stopRealTimeUpdates();
  };

  const startRealTimeUpdates = () => {
    // Fetch initial stats
    fetchStats();
    
    // Set up periodic updates
    statsInterval.current = window.setInterval(() => {
      fetchStats();
    }, 5000); // Update every 5 seconds
  };

  const stopRealTimeUpdates = () => {
    if (statsInterval.current) {
      clearInterval(statsInterval.current);
      statsInterval.current = null;
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/analytics/realtime', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const updateStatsFromBatch = (data: any) => {
    setStats(prev => ({
      ...prev,
      events: prev.events + (data.eventCount || 0)
    }));
    setLastUpdate(new Date());
  };

  const updateStatsFromEvent = (data: any) => {
    setStats(prev => {
      const newRecentEvents = [
        {
          id: data.id || Date.now().toString(),
          type: data.type || 'unknown',
          timestamp: new Date(data.timestamp || Date.now()),
          data: data.data || {}
        },
        ...prev.recentEvents.slice(0, 9) // Keep last 10 events
      ];

      return {
        ...prev,
        events: prev.events + 1,
        recentEvents: newRecentEvents
      };
    });
    setLastUpdate(new Date());
  };

  const cleanup = () => {
    stopRealTimeUpdates();
    if (wsClient.current) {
      wsClient.current.disconnect();
    }
  };

  const getOrCreateSessionId = (): string => {
    let sessionId = sessionStorage.getItem('admin_session_id');
    if (!sessionId) {
      sessionId = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('admin_session_id', sessionId);
    }
    return sessionId;
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Real-Time Analytics</h1>
          <p className="text-gray-600">Monitor user activity as it happens</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {connected ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-600" />
            )}
            <Badge variant={connected ? "success" : "destructive"}>
              {connected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
          
          <Button
            onClick={streaming ? stopStreaming : startStreaming}
            variant={streaming ? "destructive" : "default"}
            disabled={!connected}
          >
            {streaming ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Stop Streaming
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Streaming
              </>
            )}
          </Button>
        </div>
      </div>

      {connectionError && (
        <Alert variant="destructive">
          <AlertDescription>
            Connection Error: {connectionError}
          </AlertDescription>
        </Alert>
      )}

      {lastUpdate && (
        <div className="text-sm text-gray-500">
          Last updated: {formatTime(lastUpdate)}
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Currently online
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Page Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pageViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.events.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Tracked events
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Session</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(stats.avgSessionDuration)}</div>
            <p className="text-xs text-muted-foreground">
              Duration
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Pages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topPages.length === 0 ? (
                <p className="text-sm text-gray-500">No data available</p>
              ) : (
                stats.topPages.map((page, index) => (
                  <div key={page.url} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {page.url.replace(window.location.origin, '') || '/'}
                      </p>
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      {page.views}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MousePointer className="h-5 w-5" />
              Recent Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {stats.recentEvents.length === 0 ? (
                <p className="text-sm text-gray-500">No recent events</p>
              ) : (
                stats.recentEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {event.type}
                      </Badge>
                      <span className="text-gray-600">
                        {formatTime(event.timestamp)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connection Status */}
      {wsClient.current && (
        <Card>
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="font-medium">Status</p>
                <p className="text-gray-600">
                  {connected ? 'Connected' : 'Disconnected'}
                </p>
              </div>
              <div>
                <p className="font-medium">Reconnect Attempts</p>
                <p className="text-gray-600">
                  {wsClient.current.getStats().reconnectAttempts}
                </p>
              </div>
              <div>
                <p className="font-medium">Queued Messages</p>
                <p className="text-gray-600">
                  {wsClient.current.getStats().queuedMessages}
                </p>
              </div>
              <div>
                <p className="font-medium">Session ID</p>
                <p className="text-gray-600 font-mono text-xs">
                  {wsClient.current.getStats().sessionId.slice(-8)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};