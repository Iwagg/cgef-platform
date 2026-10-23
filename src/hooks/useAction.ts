import { useState } from 'react';
import { toast } from '../components/ui/Toast';
import { errorMessage } from './useOrgTable';

/** Wraps an async action with a pending flag and success/error toasts. */
export function useAction() {
  const [pending, setPending] = useState(false);
  const run = async (fn: () => Promise<unknown>, successTitle?: string): Promise<boolean> => {
    setPending(true);
    try {
      await fn();
      if (successTitle) toast({ type: 'success', title: successTitle });
      return true;
    } catch (err) {
      toast({ type: 'error', title: 'Action failed', message: errorMessage(err) });
      return false;
    } finally {
      setPending(false);
    }
  };
  return { pending, run };
}
