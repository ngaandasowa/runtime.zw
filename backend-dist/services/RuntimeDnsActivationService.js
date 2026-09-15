import { adminDb, } from '../firebaseAdmin.js';
import { cloudflareDnsService, } from './CloudflareDnsService.js';
const normalizeStatus = (value) => String(value || '')
    .trim()
    .toLowerCase();
const eligibleStatuses = new Set([
    'pending',
    'initializing',
    'moved',
]);
class RuntimeDnsActivationService {
    running = false;
    async run() {
        if (this.running) {
            return {
                scanned: 0,
                checked: 0,
                activated: 0,
                failed: 0,
                results: [],
            };
        }
        this.running = true;
        try {
            /*
             * Deliberately query only Cloudflare-backed domains.
             * Existing legacy/custom-DNS domains are never touched.
             */
            const snapshot = await adminDb
                .collection('domains')
                .where('dns_provider', '==', 'cloudflare')
                .get();
            const results = [];
            let checked = 0;
            let activated = 0;
            let failed = 0;
            for (const doc of snapshot.docs) {
                const domain = doc.data();
                const dnsStatus = normalizeStatus(domain.dns_status);
                if (dnsStatus === 'active' ||
                    !eligibleStatuses.has(dnsStatus || 'pending')) {
                    continue;
                }
                const zoneId = String(domain.cloudflare?.zone_id ||
                    '').trim();
                const domainName = cloudflareDnsService
                    .normalizeDomain(domain.domain_name);
                if (!zoneId || !domainName) {
                    continue;
                }
                checked += 1;
                const now = new Date().toISOString();
                try {
                    const zone = await cloudflareDnsService
                        .getZone(zoneId);
                    const zoneStatus = normalizeStatus(zone.status || 'pending') || 'pending';
                    const becameActive = zoneStatus === 'active';
                    await doc.ref.set({
                        dns_status: becameActive
                            ? 'active'
                            : 'pending',
                        cloudflare: {
                            ...(domain.cloudflare || {}),
                            status: zoneStatus,
                            last_synced_at: now,
                            last_error: null,
                            ...(becameActive
                                ? {
                                    activated_at: domain.cloudflare
                                        ?.activated_at ||
                                        zone.activated_on ||
                                        now,
                                }
                                : {}),
                        },
                        updated_at: now,
                    }, { merge: true });
                    if (becameActive) {
                        activated += 1;
                    }
                    results.push({
                        domainId: doc.id,
                        domainName,
                        zoneId,
                        previousStatus: dnsStatus,
                        status: zoneStatus,
                        action: becameActive
                            ? 'activated'
                            : 'still_pending',
                    });
                }
                catch (error) {
                    failed += 1;
                    const message = error instanceof Error
                        ? error.message
                        : 'Unable to check Cloudflare zone status.';
                    await doc.ref.set({
                        cloudflare: {
                            ...(domain.cloudflare || {}),
                            last_synced_at: now,
                            last_error: message,
                        },
                        updated_at: now,
                    }, { merge: true });
                    results.push({
                        domainId: doc.id,
                        domainName,
                        zoneId,
                        previousStatus: dnsStatus,
                        status: dnsStatus || 'pending',
                        action: 'check_failed',
                        error: message,
                    });
                }
            }
            return {
                scanned: snapshot.size,
                checked,
                activated,
                failed,
                results,
            };
        }
        finally {
            this.running = false;
        }
    }
}
export const runtimeDnsActivationService = new RuntimeDnsActivationService();
let activationTimer = null;
export const startRuntimeDnsActivationScheduler = () => {
    if (activationTimer) {
        return;
    }
    const minutes = Math.max(15, Number(process.env
        .RUNTIME_DNS_ACTIVATION_INTERVAL_MINUTES ||
        60) || 60);
    const runSafely = async () => {
        try {
            const result = await runtimeDnsActivationService
                .run();
            console.log(`[Runtime DNS] activation check: scanned=${result.scanned}, checked=${result.checked}, activated=${result.activated}, failed=${result.failed}`);
        }
        catch (error) {
            console.error('[Runtime DNS] activation scheduler failed:', error);
        }
    };
    /*
     * Run once shortly after startup, then periodically.
     * The delay lets the API finish booting first.
     */
    setTimeout(() => {
        void runSafely();
    }, 15_000);
    activationTimer =
        setInterval(() => {
            void runSafely();
        }, minutes * 60 * 1000);
    activationTimer.unref?.();
    console.log(`[Runtime DNS] activation scheduler started (${minutes} minute interval).`);
};
