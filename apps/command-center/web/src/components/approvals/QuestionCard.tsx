'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import type { ApprovalDecision, ApprovalRequest } from '@command-center/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { getSocket } from '@/lib/socket';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

function answer(decision: ApprovalDecision) {
  const socket = getSocket();
  if (socket.connected) {
    socket.emit('approval:respond', decision);
  } else {
    void api.respondApproval(decision.id, decision).catch((e) => console.error(e));
  }
}

export function QuestionCard({ request }: { request: ApprovalRequest }) {
  const [text, setText] = useState('');
  const isChoice = request.kind === 'choice' && (request.choices?.length ?? 0) > 0;

  function send(value: string) {
    if (!value.trim()) return;
    answer({
      id: request.id,
      decision: 'answer',
      answer: value,
      respondedAt: Date.now(),
      respondedBy: 'operator',
    });
  }

  return (
    <Card className="border-primary/40">
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Badge variant="default">{isChoice ? 'choice' : 'question'}</Badge>
        </CardTitle>
        {request.agent_name && (
          <span className="text-xs font-medium text-primary">{request.agent_name}</span>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {request.question && <p className="text-sm text-foreground/90">{request.question}</p>}

        {isChoice ? (
          <div className="flex flex-wrap gap-2">
            {request.choices!.map((c, i) => (
              <Button
                key={`${i}-${c}`}
                size="sm"
                variant="outline"
                onClick={() => send(c)}
                className={cn('max-w-full justify-start text-left')}
              >
                {c}
              </Button>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your answer…"
              rows={3}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(text);
              }}
            />
            <Button size="sm" onClick={() => send(text)} disabled={!text.trim()}>
              <Send /> Answer
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
