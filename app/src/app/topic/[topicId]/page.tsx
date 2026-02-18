import { promises as fs } from "fs";
import path from "path";
import { notFound } from "next/navigation";
import type { Curriculum } from "@/lib/types";
import TopicClient from "@/components/dashboard/TopicClient";

async function getCurriculum(): Promise<Curriculum | null> {
  try {
    const filePath = path.join(process.cwd(), "public", "content", "curriculum.json");
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as Curriculum;
  } catch {
    return null;
  }
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  const curriculum = await getCurriculum();
  const topic = curriculum?.topics.find((t) => t.id === topicId);
  if (!topic || !curriculum) notFound();

  return <TopicClient topic={topic} curriculum={curriculum} />;
}
