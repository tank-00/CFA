import { promises as fs } from "fs";
import path from "path";
import { notFound } from "next/navigation";
import type { Curriculum } from "@/lib/types";
import ReadingClient from "@/components/dashboard/ReadingClient";

async function getCurriculum(): Promise<Curriculum | null> {
  try {
    const filePath = path.join(process.cwd(), "public", "content", "curriculum.json");
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as Curriculum;
  } catch {
    return null;
  }
}

export default async function ReadingPage({
  params,
}: {
  params: Promise<{ readingId: string }>;
}) {
  const { readingId } = await params;
  const curriculum = await getCurriculum();
  if (!curriculum) notFound();

  let foundTopic = null;
  let foundReading = null;
  for (const topic of curriculum.topics) {
    const reading = topic.readings.find((r) => r.id === readingId);
    if (reading) {
      foundTopic = topic;
      foundReading = reading;
      break;
    }
  }

  if (!foundTopic || !foundReading) notFound();

  return (
    <ReadingClient
      topic={foundTopic}
      reading={foundReading}
      curriculum={curriculum}
    />
  );
}
