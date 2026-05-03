import { initDatabase, insertEvent, getFilterOptions, getRecentEvents, updateEventHITLResponse, db } from './db';
import type { HookEvent, HumanInTheLoopResponse } from './types';
import {
  createTheme,
  updateThemeById,
  getThemeById,
  searchThemes,
  deleteThemeById,
  exportThemeById,
  importTheme,
  getThemeStats
} from './theme';
import { handleTokensRequest } from './routes/tokens';
import { startTranscriptIngest } from './transcript-ingest';

// Initialize database
initDatabase();

// Store WebSocket clients
const wsClients = new Set<any>();

// Bun WebSocket readyState constants: 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED.
// send() returns the number of bytes written, 0 on dropped/queued, or -1 on
// backpressure/closed depending on the runtime. We only feed sockets that are
// definitely OPEN, and log (don't bubble) on backpressure.
const WS_OPEN = 1;

function broadcast(message: unknown): void {
  const payload = JSON.stringify(message);
  for (const client of wsClients) {
    if (client.readyState !== WS_OPEN) {
      wsClients.delete(client);
      continue;
    }
    try {
      const result = client.send(payload);
      if (result === -1) {
        // Backpressure — server is producing faster than the client can drain.
        console.warn('[ws] backpressure on client; dropping message for slow consumer');
      }
    } catch (err) {
      // send() threw (e.g. socket transitioned mid-loop). Drop the client.
      wsClients.delete(client);
    }
  }
}

// Capture stop thunk so SIGTERM/SIGINT can flush in-flight ingests cleanly.
// Promise resolves to the thunk; rejection is logged but doesn't crash the boot.
let ingestStop: (() => Promise<void>) | null = null;
startTranscriptIngest({
  onTokenEvent: (record) => broadcast({ type: 'token_event', data: record }),
})
  .then((stop) => {
    ingestStop = stop;
  })
  .catch((err) => {
    console.error('[ingest] failed to start watcher:', err);
  });

// Helper to coerce query-string ints. SQLite's LIMIT/OFFSET will throw on
// NaN — anything non-finite or non-positive falls back to defaults.
function parsePositiveInt(raw: string | null, fallback: number): number {
  if (raw === null) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// Validate WebSocket URL to prevent SSRF - only allow localhost connections
function isAllowedWebSocketUrl(wsUrl: string): boolean {
  try {
    const parsed = new URL(wsUrl);
    const allowedHosts = ['localhost', '127.0.0.1', '::1'];
    return allowedHosts.includes(parsed.hostname);
  } catch {
    return false;
  }
}

// Helper function to send response to agent via WebSocket
async function sendResponseToAgent(
  wsUrl: string,
  response: HumanInTheLoopResponse
): Promise<void> {
  if (!isAllowedWebSocketUrl(wsUrl)) {
    throw new Error(`WebSocket URL not allowed: only localhost connections are permitted`);
  }

  console.log(`[HITL] Connecting to agent WebSocket: ${wsUrl}`);

  return new Promise((resolve, reject) => {
    let ws: WebSocket | null = null;
    let isResolved = false;

    const cleanup = () => {
      if (ws) {
        try {
          ws.close();
        } catch (e) {
          // Ignore close errors
        }
      }
    };

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (isResolved) return;
        console.log('[HITL] WebSocket connection opened, sending response...');

        try {
          ws!.send(JSON.stringify(response));
          console.log('[HITL] Response sent successfully');

          // Wait longer to ensure message fully transmits before closing
          setTimeout(() => {
            cleanup();
            if (!isResolved) {
              isResolved = true;
              resolve();
            }
          }, 500);
        } catch (error) {
          console.error('[HITL] Error sending message:', error);
          cleanup();
          if (!isResolved) {
            isResolved = true;
            reject(error);
          }
        }
      };

      ws.onerror = (error) => {
        console.error('[HITL] WebSocket error:', error);
        cleanup();
        if (!isResolved) {
          isResolved = true;
          reject(error);
        }
      };

      ws.onclose = () => {
        console.log('[HITL] WebSocket connection closed');
      };

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!isResolved) {
          console.error('[HITL] Timeout sending response to agent');
          cleanup();
          isResolved = true;
          reject(new Error('Timeout sending response to agent'));
        }
      }, 5000);

    } catch (error) {
      console.error('[HITL] Error creating WebSocket:', error);
      cleanup();
      if (!isResolved) {
        isResolved = true;
        reject(error);
      }
    }
  });
}

// Create Bun server with HTTP and WebSocket support
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: parseInt(process.env.SERVER_PORT || '4000'),
  
  async fetch(req: Request) {
   try {
    const url = new URL(req.url);

    // Handle CORS - restrict to known local origins. For unknown origins we
    // OMIT the Access-Control-Allow-Origin header rather than reflecting an
    // arbitrary allowlisted value (which would mask CSRF chains in the WS auth
    // token leak class). The browser will block the response naturally.
    const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'];
    const requestOrigin = req.headers.get('Origin') || '';
    const isAllowedOrigin = allowedOrigins.includes(requestOrigin);
    const headers: Record<string, string> = {
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    if (isAllowedOrigin) {
      headers['Access-Control-Allow-Origin'] = requestOrigin;
    }

    // Handle preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers });
    }
    
    // POST /events - Receive new events
    if (url.pathname === '/events' && req.method === 'POST') {
      try {
        const event: HookEvent = await req.json();
        
        // Validate required fields
        if (!event.source_app || !event.session_id || !event.hook_event_type || !event.payload) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400,
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        }
        
        // Insert event into database
        const savedEvent = insertEvent(event);

        // Broadcast to all WebSocket clients
        broadcast({ type: 'event', data: savedEvent });

        return new Response(JSON.stringify(savedEvent), {
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error processing event:', error);
        return new Response(JSON.stringify({ error: 'Invalid request' }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // GET /events/filter-options - Get available filter options
    if (url.pathname === '/events/filter-options' && req.method === 'GET') {
      const options = getFilterOptions();
      return new Response(JSON.stringify(options), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }
    
    // GET /events/recent - Get recent events
    if (url.pathname === '/events/recent' && req.method === 'GET') {
      const rawLimit = parsePositiveInt(url.searchParams.get('limit'), 100);
      const limit = Math.max(1, Math.min(rawLimit, 1000));
      const events = getRecentEvents(limit);
      return new Response(JSON.stringify(events), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // POST /events/:id/respond - Respond to HITL request
    if (url.pathname.match(/^\/events\/\d+\/respond$/) && req.method === 'POST') {
      const id = parseInt(url.pathname.split('/')[2]);

      try {
        const response: HumanInTheLoopResponse = await req.json();
        response.respondedAt = Date.now();

        // Update event in database
        const updatedEvent = updateEventHITLResponse(id, response);

        if (!updatedEvent) {
          return new Response(JSON.stringify({ error: 'Event not found' }), {
            status: 404,
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        }

        // Send response to agent via WebSocket
        if (updatedEvent.humanInTheLoop?.responseWebSocketUrl) {
          try {
            await sendResponseToAgent(
              updatedEvent.humanInTheLoop.responseWebSocketUrl,
              response
            );
          } catch (error) {
            console.error('Failed to send response to agent:', error);
            // Don't fail the request if we can't reach the agent
          }
        }

        // Broadcast updated event to all connected clients
        broadcast({ type: 'event', data: updatedEvent });

        return new Response(JSON.stringify(updatedEvent), {
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error processing HITL response:', error);
        return new Response(JSON.stringify({ error: 'Invalid request' }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
    }

    // Theme API endpoints
    
    // POST /api/themes - Create a new theme
    if (url.pathname === '/api/themes' && req.method === 'POST') {
      try {
        const themeData = await req.json();
        const result = await createTheme(themeData);
        
        const status = result.success ? 201 : 400;
        return new Response(JSON.stringify(result), {
          status,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error creating theme:', error);
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Invalid request body' 
        }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // GET /api/themes - Search themes
    if (url.pathname === '/api/themes' && req.method === 'GET') {
      const limitParam = url.searchParams.get('limit');
      const offsetParam = url.searchParams.get('offset');
      const parsedLimit = limitParam !== null
        ? (() => { const n = parseInt(limitParam, 10); return Number.isFinite(n) && n > 0 ? n : undefined; })()
        : undefined;
      const parsedOffset = offsetParam !== null
        ? (() => { const n = parseInt(offsetParam, 10); return Number.isFinite(n) && n >= 0 ? n : undefined; })()
        : undefined;
      const query = {
        query: url.searchParams.get('query') || undefined,
        isPublic: url.searchParams.get('isPublic') ? url.searchParams.get('isPublic') === 'true' : undefined,
        authorId: url.searchParams.get('authorId') || undefined,
        sortBy: url.searchParams.get('sortBy') as any || undefined,
        sortOrder: url.searchParams.get('sortOrder') as any || undefined,
        limit: parsedLimit,
        offset: parsedOffset,
      };

      const result = await searchThemes(query);
      return new Response(JSON.stringify(result), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }
    
    // GET /api/themes/:id - Get a specific theme
    if (url.pathname.startsWith('/api/themes/') && req.method === 'GET') {
      const id = url.pathname.split('/')[3];
      if (!id) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Theme ID is required' 
        }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
      
      const result = await getThemeById(id);
      const status = result.success ? 200 : 404;
      return new Response(JSON.stringify(result), {
        status,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }
    
    // PUT /api/themes/:id - Update a theme
    if (url.pathname.startsWith('/api/themes/') && req.method === 'PUT') {
      const id = url.pathname.split('/')[3];
      if (!id) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Theme ID is required' 
        }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
      
      try {
        const updates = await req.json();
        const authorId = url.searchParams.get('authorId');
        if (!authorId) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Unauthorized - authorId query parameter is required'
          }), {
            status: 401,
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        }
        const result = await updateThemeById(id, updates, authorId);

        const status = result.success ? 200 : (result.error?.includes('Unauthorized') ? 403 : 400);
        return new Response(JSON.stringify(result), {
          status,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error updating theme:', error);
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid request body'
        }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // DELETE /api/themes/:id - Delete a theme
    if (url.pathname.startsWith('/api/themes/') && req.method === 'DELETE') {
      const id = url.pathname.split('/')[3];
      if (!id) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Theme ID is required' 
        }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
      
      const authorId = url.searchParams.get('authorId');
      const result = await deleteThemeById(id, authorId || undefined);
      
      const status = result.success ? 200 : (result.error?.includes('not found') ? 404 : 403);
      return new Response(JSON.stringify(result), {
        status,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }
    
    // GET /api/themes/:id/export - Export a theme
    if (url.pathname.match(/^\/api\/themes\/[^\/]+\/export$/) && req.method === 'GET') {
      const id = url.pathname.split('/')[3];
      
      const result = await exportThemeById(id);
      if (!result.success) {
        const status = result.error?.includes('not found') ? 404 : 400;
        return new Response(JSON.stringify(result), {
          status,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify(result.data), {
        headers: { 
          ...headers, 
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${result.data.theme.name}.json"`
        }
      });
    }
    
    // POST /api/themes/import - Import a theme
    if (url.pathname === '/api/themes/import' && req.method === 'POST') {
      try {
        const importData = await req.json();
        const authorId = url.searchParams.get('authorId');
        
        const result = await importTheme(importData, authorId || undefined);
        
        const status = result.success ? 201 : 400;
        return new Response(JSON.stringify(result), {
          status,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error importing theme:', error);
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Invalid import data' 
        }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // GET /api/themes/stats - Get theme statistics
    if (url.pathname === '/api/themes/stats' && req.method === 'GET') {
      const result = await getThemeStats();
      return new Response(JSON.stringify(result), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }
    
    // Token usage endpoints (/api/tokens/summary, /timeseries, /breakdown, /event)
    const tokensResponse = handleTokensRequest(url, req, headers);
    if (tokensResponse) return tokensResponse;

    // /api/tokens/* fallthrough — anything under this prefix that didn't match
    // a handler above is either a non-GET method or an unknown subpath. Per
    // the spec, return 405 Method Not Allowed with `Allow: GET` rather than
    // dropping into the default banner response (which would mask client bugs).
    if (url.pathname.startsWith('/api/tokens/')) {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: { ...headers, 'Allow': 'GET', 'Content-Type': 'text/plain' },
      });
    }

    // WebSocket upgrade
    if (url.pathname === '/stream') {
      const success = server.upgrade(req);
      if (success) {
        return undefined;
      }
    }

    // Default response
    return new Response('Multi-Agent Observability Server', {
      headers: { ...headers, 'Content-Type': 'text/plain' }
    });
   } catch (err) {
     // Catch-all for any handler that throws (JSON parse errors not already
     // wrapped, SQLite throws on bad input, etc). Never echo err.message to the
     // client — that's a leak vector. The server log gets the full detail.
     console.error('[fetch]', err);
     return new Response('Internal Server Error', { status: 500 });
   }
  },
  
  websocket: {
    open(ws) {
      console.log('WebSocket client connected');
      wsClients.add(ws);
      
      // Send recent events on connection
      const events = getRecentEvents(300);
      ws.send(JSON.stringify({ type: 'initial', data: events }));
    },
    
    message(ws, message) {
      // Handle any client messages if needed
      console.log('Received message:', message);
    },
    
    close(ws) {
      console.log('WebSocket client disconnected');
      wsClients.delete(ws);
    },
    
    error(ws, error) {
      console.error('WebSocket error:', error);
      wsClients.delete(ws);
    }
  }
});

console.log(`🚀 Server running on http://localhost:${server.port}`);
console.log(`📊 WebSocket endpoint: ws://localhost:${server.port}/stream`);
console.log(`📮 POST events to: http://localhost:${server.port}/events`);

// Graceful shutdown — flush in-flight ingest, checkpoint the WAL via db.close,
// then stop accepting new connections. Each step is wrapped so a failure in
// one stage doesn't deadlock the others; final exit is unconditional.
let shuttingDown = false;
async function shutdown(sig: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[shutdown] received ${sig}`);
  try {
    if (ingestStop) await ingestStop();
  } catch (e) {
    console.error('[shutdown] ingest stop error:', e);
  }
  try {
    db.close();
  } catch (e) {
    console.error('[shutdown] db close error:', e);
  }
  try {
    server.stop(true);
  } catch (e) {
    console.error('[shutdown] server stop error:', e);
  }
  process.exit(0);
}
process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
process.on('SIGINT', () => { void shutdown('SIGINT'); });