import { adminDb, } from '../firebaseAdmin.js';
import { cloudflareDnsService, } from './CloudflareDnsService.js';
import { emailService, } from '../email/emailService.js';
const normalizeStatus = (value) => String(value || '').trim().toLowerCase();
const normalizeNameservers = (value) => Array.isArray(value)
    ? value
        .map((item) => String(item || '')
        .trim()
        .toLowerCase()
        .replace(/\.$/, ''))
        .filter(Boolean)
    : [];
const eligibleDnsStatuses = new Set([
    'pending',
    'initializing',
    'moved',
]);
const eligibleMigrationStatuses = new Set([
    'delegation_pending',
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
             * Do not query only dns_provider=cloudflare.
             * During a safe Custom DNS -> Runtime DNS migration the old provider
             * remains authoritative until the new delegation is confirmed.
             */
            const snapshot = await adminDb
                .collection('domains')
                .get();
            const results = [];
            let checked = 0;
            let activated = 0;
            let failed = 0;
            for (const doc of snapshot.docs) {
                const domain = doc.data();
                const dnsStatus = normalizeStatus(domain.dns_status);
                const migrationStatus = normalizeStatus(domain.dns_migration?.status);
                const isMigration = eligibleMigrationStatuses.has(migrationStatus);
                const isNormalRuntimeActivation = normalizeStatus(domain.dns_provider) === 'cloudflare' &&
                    eligibleDnsStatuses.has(dnsStatus || 'pending');
                if (!isMigration &&
                    !isNormalRuntimeActivation) {
                    continue;
                }
                const zoneId = String(domain.cloudflare?.zone_id ||
                    domain.dns_migration?.zone_id ||
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
                    if (!becameActive) {
                        await doc.ref.set({
                            cloudflare: {
                                ...(domain.cloudflare || {}),
                                status: zoneStatus,
                                last_synced_at: now,
                                last_error: null,
                            },
                            updated_at: now,
                        }, { merge: true });
                        results.push({
                            domainId: doc.id,
                            domainName,
                            zoneId,
                            previousStatus: dnsStatus,
                            status: zoneStatus,
                            action: 'still_pending',
                        });
                        continue;
                    }
                    const assignedNameservers = normalizeNameservers(zone.name_servers?.length
                        ? zone.name_servers
                        : domain.cloudflare
                            ?.assigned_nameservers);
                    const pendingNameserverIps = Array.isArray(domain.dns_migration
                        ?.pending_nameserver_ips)
                        ? domain.dns_migration
                            .pending_nameserver_ips
                        : Array.isArray(domain.nameserver_ips)
                            ? domain.nameserver_ips
                            : [];
                    const migrationUpdate = isMigration
                        ? {
                            ...(domain.dns_migration || {}),
                            status: 'completed',
                            completed_at: domain.dns_migration
                                ?.completed_at || now,
                            last_error: null,
                        }
                        : undefined;
                    await doc.ref.set({
                        dns_provider: 'cloudflare',
                        dns_status: 'active',
                        ...(assignedNameservers.length
                            ? {
                                nameservers: assignedNameservers,
                            }
                            : {}),
                        nameserver_ips: pendingNameserverIps,
                        cloudflare: {
                            ...(domain.cloudflare || {}),
                            zone_id: zoneId,
                            ...(assignedNameservers.length
                                ? {
                                    assigned_nameservers: assignedNameservers,
                                }
                                : {}),
                            status: 'active',
                            activated_at: domain.cloudflare
                                ?.activated_at ||
                                zone.activated_on ||
                                now,
                            last_synced_at: now,
                            last_error: null,
                        },
                        ...(migrationUpdate
                            ? {
                                dns_migration: migrationUpdate,
                            }
                            : {}),
                        ...(isMigration
                            ? {
                                nameserver_change_status: null,
                                pending_nameservers: null,
                                pending_nameserver_ips: null,
                            }
                            : {}),
                        updated_at: now,
                    }, { merge: true });
                    if (isMigration) {
                        const registryRequestId = String(domain.dns_migration
                            ?.registry_request_id || '').trim();
                        if (registryRequestId) {
                            await adminDb
                                .collection('registry_requests')
                                .doc(registryRequestId)
                                .set({
                                status: 'confirmed',
                                confirmed_at: now,
                                registry_response_notes: 'Runtime DNS activation detected automatically after Cloudflare confirmed the delegated zone is active.',
                                updated_at: now,
                            }, { merge: true });
                        }
                        /*
                         * Send the migration completion email only once.
                         * The marker is written only after sendEvent succeeds, so a
                         * temporary mail failure can be retried by a later scheduler run.
                         */
                        if (!domain.dns_migration
                            ?.completion_email_sent_at &&
                            String(domain.user_email || '').trim()) {
                            try {
                                await emailService.sendEvent('dns_migration_completed', {
                                    email: String(domain.user_email).trim(),
                                    name: String(domain.owner_details
                                        ?.full_name || '').trim() ||
                                        undefined,
                                    domainName,
                                    nameservers: assignedNameservers,
                                    dnsProvider: 'cloudflare',
                                    dnsStatus: 'active',
                                });
                                await doc.ref.set({
                                    dns_migration: {
                                        ...migrationUpdate,
                                        completion_email_sent_at: now,
                                        completion_email_error: null,
                                    },
                                    updated_at: now,
                                }, { merge: true });
                            }
                            catch (mailError) {
                                const message = mailError instanceof Error
                                    ? mailError.message
                                    : 'Unable to send Runtime DNS completion email.';
                                await doc.ref.set({
                                    dns_migration: {
                                        ...migrationUpdate,
                                        completion_email_error: message,
                                        completion_email_last_attempt_at: now,
                                    },
                                    updated_at: now,
                                }, { merge: true });
                                console.error(`Runtime DNS completion email failed for ${domainName}:`, mailError);
                            }
                        }
                    }
                    activated += 1;
                    results.push({
                        domainId: doc.id,
                        domainName,
                        zoneId,
                        previousStatus: dnsStatus,
                        status: 'active',
                        action: isMigration
                            ? 'migration_completed'
                            : 'activated',
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
                        ...(isMigration
                            ? {
                                dns_migration: {
                                    ...(domain.dns_migration ||
                                        {}),
                                    last_error: message,
                                },
                            }
                            : {}),
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
