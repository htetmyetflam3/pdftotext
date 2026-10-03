/**
 * createreqHandler
 * Chains: validate → hold text → save raw.
 * Queue ownership begins after this returns; queue.js binds the generated
 * submitId and performs the submissions-row update from its retained query.
 */
export function createInputHandler({ textHolder, metadataGuard, rawSaver }) {
  return async function handleInput({ req, formId, parsedText, quarantinePath, bypassIdentity = false }) {
    const source = req.file ? 'file' : 'text';
    const originalName = req.file?.originalname || null;
    await metadataGuard.validateSubmission({
      userId: req.userId,
      formId,
      source,
      bypassIdentity,
    });
    const textContent = await textHolder({ req, source, parsedText });
    const result = await rawSaver({
      formId,
      textContent,
      metadata: {
        userId: req.userId,
        visitorHash: req.visitorHash,
        source,
        originalName,
        quarantinePath,
      },
    });
    return result;
  };
}