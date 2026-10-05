import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { createQueryClient } from '@/api/query-client';

export default function RootLayout(): ReactElement {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <Stack />
    </QueryClientProvider>
  );
}
