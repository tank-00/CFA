import { promises as fs } from "fs";
import path from "path";
import { notFound } from "next/navigation";
import type { Stage, Curriculum } from "@/lib/types";
import StageReader from "@/components/reader/StageReader";

async function getStage(stageId: string): Promise<Stage | null> {
  try {
    const filePath = path.join(
      process.cwd(),
      "public",
      "content",
      "stages",
      `${stageId}.json`
    );
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as Stage;
  } catch {
    return null;
  }
}

async function getCurriculum(): Promise<Curriculum | null> {
  try {
    const filePath = path.join(process.cwd(), "public", "content", "curriculum.json");
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as Curriculum;
  } catch {
    return null;
  }
}

export default async function StagePage({
  params,
}: {
  params: Promise<{ stageId: string }>;
}) {
  const { stageId } = await params;
  const [stage, curriculum] = await Promise.all([
    getStage(stageId),
    getCurriculum(),
  ]);

  if (!stage) notFound();

  return <StageReader stage={stage} curriculum={curriculum} />;
}
