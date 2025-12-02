import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { NetworkTrafficFilter, OCPPFrame } from '@/types/ocpp';
import { useState } from 'react';

interface NetworkTrafficProps {
  frames: OCPPFrame[];
  paused: boolean;
  onTogglePause: () => void;
  onCopy: () => void;
  onClear: () => void;
}

const ToggleBtn = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <Button
    size='sm'
    variant={active ? 'default' : 'outline'}
    onClick={onClick}
    className='h-7 px-2'
  >
    {children}
  </Button>
);

const formatCellValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export const NetworkTraffic = ({
  frames,
  paused,
  onTogglePause,
  onCopy,
  onClear,
}: NetworkTrafficProps) => {
  const [filter, setFilter] = useState<NetworkTrafficFilter>({
    dir: 'all',
    kind: 'all',
    q: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const filteredFrames = frames.filter((frame) => {
    if (filter.dir !== 'all' && frame.dir !== filter.dir) return false;
    if (filter.kind !== 'all' && frame.type !== filter.kind) return false;
    if (
      searchQuery &&
      !`${frame.action} ${frame.id}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  const toggleRow = (idx: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <Card>
      <CardContent className='p-0'>
        <div className='flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex flex-wrap items-center gap-2'>
            <ToggleBtn
              active={filter.dir === 'all' && filter.kind === 'all'}
              onClick={() => setFilter({ dir: 'all', kind: 'all', q: '' })}
            >
              All
            </ToggleBtn>
            <ToggleBtn
              active={filter.dir === 'out'}
              onClick={() => setFilter({ ...filter, dir: 'out' })}
            >
              →
            </ToggleBtn>
            <ToggleBtn
              active={filter.dir === 'in'}
              onClick={() => setFilter({ ...filter, dir: 'in' })}
            >
              ←
            </ToggleBtn>
            <div className='mx-2 h-4 w-px bg-border' />
            <ToggleBtn
              active={filter.kind === 'CALL'}
              onClick={() => setFilter({ ...filter, kind: 'CALL' })}
            >
              CALL
            </ToggleBtn>
            <ToggleBtn
              active={filter.kind === 'CALLRESULT'}
              onClick={() => setFilter({ ...filter, kind: 'CALLRESULT' })}
            >
              RESULT
            </ToggleBtn>
            <ToggleBtn
              active={filter.kind === 'CALLERROR'}
              onClick={() => setFilter({ ...filter, kind: 'CALLERROR' })}
            >
              ERROR
            </ToggleBtn>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <Input
              placeholder='Search'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='w-full h-8 sm:w-40'
            />
            <Button
              size='sm'
              variant='outline'
              onClick={onTogglePause}
              className='h-8 flex-1 sm:flex-initial'
            >
              {paused ? 'Resume' : 'Pause'}
            </Button>
            <Button
              size='sm'
              variant='outline'
              onClick={onCopy}
              className='h-8 flex-1 sm:flex-initial'
            >
              Copy
            </Button>
            <Button 
              size='sm' 
              variant='ghost' 
              onClick={onClear} 
              className='h-8 flex-1 sm:flex-initial'
            >
              Clear
            </Button>
          </div>
        </div>

        <div className='max-h-[60vh] overflow-auto sm:max-h-96'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-[80px] sm:w-[120px]'>Time</TableHead>
                <TableHead className='w-[40px] sm:w-[60px]'>Dir</TableHead>
                <TableHead className='w-[80px] sm:w-[120px]'>Type</TableHead>
                <TableHead className='min-w-[100px]'>Action</TableHead>
                <TableHead className='w-[120px] sm:w-[220px]'>Id</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFrames.map((frame, idx) => {
                const isOpen = expanded.has(idx);
                const actionLabel = formatCellValue(frame.action);
                const idLabel = formatCellValue(frame.id);
                return [
                  <TableRow
                    key={`row-${idx}`}
                    className='cursor-pointer'
                    onClick={() => toggleRow(idx)}
                    aria-expanded={isOpen}
                  >
                    <TableCell className='text-xs'>
                      {new Date(frame.ts).toLocaleTimeString()}
                    </TableCell>
                    <TableCell className='text-xs font-semibold'>
                      <Badge variant='outline'>
                        {frame.dir === 'out' ? '→' : '←'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {frame.type === 'CALL' && (
                        <Badge variant='default'>CALL</Badge>
                      )}
                      {frame.type === 'CALLRESULT' && (
                        <Badge variant='secondary'>RESULT</Badge>
                      )}
                      {frame.type === 'CALLERROR' && (
                        <Badge variant='destructive'>ERROR</Badge>
                      )}
                      {['OPEN', 'CLOSE', 'ERROR', 'PARSE_ERR'].includes(
                        frame.type
                      ) && <Badge variant='outline'>{frame.type}</Badge>}
                    </TableCell>
                    <TableCell className='text-xs'>{actionLabel}</TableCell>
                    <TableCell className='font-mono text-xs'>
                      {idLabel}
                    </TableCell>
                  </TableRow>,
                  isOpen ? (
                    <TableRow key={`detail-${idx}`}>
                      <TableCell colSpan={5}>
                        <pre className='mt-2 whitespace-pre-wrap rounded-md border bg-muted/40 p-2 text-xs'>
                          {JSON.stringify(frame.raw, null, 2)}
                        </pre>
                      </TableCell>
                    </TableRow>
                  ) : null,
                ];
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default NetworkTraffic;
