import { useEffect, useState } from 'react';
import { Crown, Sparkles } from 'lucide-react';
import { useLocation } from 'wouter';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  APP_EVENTS,
  requestSettingsSubscription,
  subscribeToAppEvent,
  type FreePlanLimitRequest,
} from '@/lib/app-events';

export default function FreePlanLimitDialog() {
  const [, setLocation] = useLocation();
  const [request, setRequest] = useState<FreePlanLimitRequest | null>(null);

  useEffect(() => {
    return subscribeToAppEvent<FreePlanLimitRequest>(
      APP_EVENTS.freePlanLimitReached,
      (event) => setRequest(event.detail),
    );
  }, []);

  const resourceLabel = request?.resource === 'transactions' ? 'transaksi keuangan' : 'catatan';

  const handleUpgrade = () => {
    setRequest(null);
    setLocation('/subscription');
  };

  return (
    <Dialog open={request !== null} onOpenChange={(open) => !open && setRequest(null)}>
      <DialogContent className="max-w-sm rounded-[1.5rem]">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Crown size={24} />
          </div>
          <DialogTitle className="text-center">Batas Paket Free Tercapai</DialogTitle>
          <DialogDescription className="pt-2 text-center leading-relaxed">
            Paket Free hanya dapat membuat maksimal {request?.limit ?? 3} {resourceLabel}.
            Upgrade ke Premium untuk membuat catatan dan transaksi tanpa batas.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2 gap-2 sm:flex-col sm:space-x-0">
          <Button type="button" onClick={handleUpgrade} className="w-full gap-2">
            <Sparkles size={16} />
            Upgrade ke Premium
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setRequest(null);
              requestSettingsSubscription();
            }}
            className="w-full"
          >
            Lihat informasi paket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}