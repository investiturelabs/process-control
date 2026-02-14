import { Loader2 } from 'lucide-react';

interface Props {
  slow?: boolean;
}

export function LoadingSpinner({ slow }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Loader2 size={28} className="animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Loading...</p>
      {slow && (
        <p className="text-xs text-muted-foreground">
          Taking longer than expected. Check your connection.
        </p>
      )}
    </div>
  );
}
