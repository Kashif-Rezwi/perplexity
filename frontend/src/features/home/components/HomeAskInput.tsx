'use client';

import { useAskSubmit } from '../hooks/useAskSubmit';
import { AskInput } from './AskInput';

export function HomeAskInput() {
  const { submitAsk, isPending, errorMessage } = useAskSubmit();

  return (
    <AskInput
      isPending={isPending}
      errorMessage={errorMessage}
      onSubmit={submitAsk}
    />
  );
}
