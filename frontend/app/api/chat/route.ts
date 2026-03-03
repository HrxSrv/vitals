import { StreamingTextResponse } from 'ai';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, profileId } = body;
    
    // Get the last user message
    const lastMessage = messages[messages.length - 1];
    
    // Get auth token from request headers
    const authHeader = req.headers.get('authorization');
    
    // Forward to your backend
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify({ 
        message: lastMessage.content,
        profileId 
      }),
    });

    if (!response.ok) {
      return new Response(`Backend error: ${response.status}`, { status: response.status });
    }

    if (!response.body) {
      return new Response('No response body', { status: 500 });
    }

    // Transform your backend's SSE format to plain text stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = decoder.decode(value, { stream: true });
            const lines = text.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const payload = line.slice(6).trim();
                if (payload === '[DONE]') {
                  controller.close();
                  return;
                }
                try {
                  const parsed = JSON.parse(payload) as { chunk: string };
                  if (parsed.chunk) {
                    // Send the chunk as plain text (AI SDK expects this)
                    controller.enqueue(new TextEncoder().encode(parsed.chunk));
                  }
                } catch {
                  // Skip malformed lines
                }
              }
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
