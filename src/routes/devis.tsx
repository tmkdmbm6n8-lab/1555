import { createFileRoute } from '@tanstack/react-router';
import { QuotePage } from '@/components/tclean/public-pages';
import { businessQuery, pageHead } from '@/lib/business-query';

export const Route = createFileRoute('/devis')({
  loader: ({ context }) => context.queryClient.ensureQueryData(businessQuery),
  head: ({ loaderData }) => pageHead(
    loaderData ?? ({ name: 'TClean' } as import('@/lib/business').BusinessConfig),
    'Prestation sur mesure',
    'Transmettez votre demande à TClean.',
    '/devis',
  ),
  component: QuotePage,
});
