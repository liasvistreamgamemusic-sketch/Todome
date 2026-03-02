import { AppShell } from '@/components/layout/app-shell';
import { AuthGuard } from '@/components/auth/auth-guard';
import { IcsSyncProvider } from '@/components/calendar/ics-sync-provider';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <IcsSyncProvider />
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
