import { promises as fs } from "fs";
import path from "path";
import type { Curriculum } from "@/lib/types";
import NotesClient from "@/components/dashboard/NotesClient";

async function getCurriculum(): Promise<Curriculum | null> {
  try {
    const filePath = path.join(process.cwd(), "public", "content", "curriculum.json");
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as Curriculum;
  } catch {
    return null;
  }
}

export default async function NotesPage() {
  const curriculum = await getCurriculum();
  return <NotesClient curriculum={curriculum} />;
}
