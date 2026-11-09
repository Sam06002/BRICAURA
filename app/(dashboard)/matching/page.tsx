import { getProperties } from '@/app/actions/properties';
import { getTenants } from '@/app/actions/tenants';
import { getMatchInteractions } from '@/app/actions/matches';
import { MatchingWorkspace } from '@/components/matching-workspace';

export default async function MatchingPage() {
  const [properties, tenants, interactions] = await Promise.all([
    getProperties(),
    getTenants(),
    getMatchInteractions(),
  ]);

  return (
    <MatchingWorkspace
      properties={properties}
      tenants={tenants}
      interactions={interactions}
    />
  );
}
