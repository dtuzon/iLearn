import { prisma } from '../src/lib/prisma';
import { BatchesService } from '../src/modules/batches/batches.service';

async function main() {
  const batchId = 'cmpl6fc890000lwg60kimf0b4';
  console.log(`--- Fetching Batch ${batchId} ---`);
  const batch = await prisma.batch.findUnique({
    where: { id: batchId }
  });

  if (!batch) {
    console.error('Batch not found');
    return;
  }

  console.log(`Found Batch: ${batch.name}. Generating Zoom sessions...`);
  // Exclude database client and call generateZoomMeetingsForBatch directly
  await (BatchesService as any).generateZoomMeetingsForBatch({
    id: batch.id,
    startDate: batch.startDate,
    courseId: batch.courseId,
    learningPathId: batch.learningPathId
  });

  console.log('Zoom session generation complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
