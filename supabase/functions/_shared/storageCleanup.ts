// Serialize cron and account deletion so a late worker cannot delete a reused path.
export async function drainStorageCleanup(admin: any, maxBatches = 5) {
  const token = crypto.randomUUID();
  const lock = await admin.rpc('claim_one_storage_worker', { p_token: token });
  if (lock.error || lock.data !== true) throw new Error('Cleanup already running');
  let removed = 0;
  const deadline = Date.now() + 60000;
  try {
    for (let batch = 0; batch < maxBatches && Date.now() < deadline; batch++) {
      const { data, error } = await admin.rpc('one_storage_deletion_batch');
      if (error) throw new Error('Cleanup queue unavailable');
      if (!data?.length) return { removed, pending: false };
      const paths = data.map((item: { path: string }) => item.path);
      const result = await admin.storage.from('site-files').remove(paths);
      if (result.error) throw new Error('Storage cleanup pending; retry required');
      const deleted = await admin.from('one_storage_deletions').delete().in('path', paths);
      if (deleted.error) throw new Error('Cleanup acknowledgement pending');
      removed += paths.length;
    }
    return { removed, pending: true };
  } finally {
    await admin.rpc('release_one_storage_worker', { p_token: token });
  }
}
