import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { Configurator } from '@/components/tclean/configurator';
import { PageHeading } from '@/components/tclean/shared';
import { businessQuery, pageHead } from '@/lib/business-query';
import { furnitureTypes } from '@/lib/configurator';

export const Route = createFileRoute('/configurateur')({
  validateSearch: (search: Record<string, unknown>): { mobilier?: string | undefined } => ({ mobilier: typeof search['mobilier'] === 'string' && furnitureTypes.some(t => t.id === search['mobilier']) ? search['mobilier'] : undefined }),
  loader: ({ context }) => context.queryClient.ensureQueryData(businessQuery),
  head: ({ loaderData }) => pageHead(loaderData ?? ({ name: 'TClean' } as import('@/lib/business').BusinessConfig), 'Configurateur de canapé et estimation de nettoyage', 'Configurez votre canapé, son tissu et sa couleur, visualisez la différence et demandez votre estimation TClean à Strasbourg.', '/configurateur'),
  component: () => <><PageHeading className="page-heading-configurator" title="Configurez votre canapé et obtenez votre estimation" description="Choisissez votre mobilier, sa forme et son tissu. Visualisez votre configuration et obtenez une estimation personnalisée pour le nettoyage à domicile par TClean." /><section className="section container-main"><div className="configurator-reassurance"><span className="configurator-reassurance-mark" aria-hidden="true">✓</span><p><strong>Déplacement offert dès 30 € d’intervention.</strong><span>Votre estimation est indicative : nous confirmons le montant total avec vous avant validation.</span></p></div><Configurator /></section></>,
});
