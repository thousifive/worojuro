/**
 * Resume parser — extracts skills/experience/education + generates embedding.
 *
 * AI provider: see server/ai/client.ts
 * Embedding dimensions: 768 (Ollama nomic-embed-text)
 *                       1536 when switching to OpenAI — needs migration
 *
 * Dedup rule: skip entirely if resume.embedding IS NOT NULL already.
 */

import { generateText, generateEmbedding } from './client';
import { type DB, resumes, users } from '../db';
import { eq, and, isNull } from 'drizzle-orm';
import { createServiceClient } from '@/lib/supabase/server';

type ParsedExperience = Array<{
  company: string; role: string;
  start_date: string; end_date: string | null; description: string;
}>;

type ParsedEducation = Array<{
  institution: string; degree: string; field: string; year: number | null;
}>;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require('pdf-parse') as {
  PDFParse: new (options: { data: Buffer }) => {
    getText: () => Promise<{ pages: Array<{ text: string; num: number }> }>;
  };
};

const SYSTEM_PROMPT = `You are a data extraction tool. Your only job is to parse CV/resume text and output structured JSON.
You must always respond with valid JSON only. No explanations, no refusals, no extra text.

Output this exact JSON structure:
{
  "skills": ["list soft skills and competencies here"],
  "tech_stack": ["list programming languages, frameworks, tools here"],
  "experience": [
    {
      "company": "company name",
      "role": "job title",
      "start_date": "YYYY-MM or YYYY",
      "end_date": "YYYY-MM or YYYY or null if current",
      "description": "brief summary of responsibilities"
    }
  ],
  "education": [
    {
      "institution": "university or school name",
      "degree": "degree type",
      "field": "field of study",
      "year": graduation year as number or null
    }
  ]
}

If a field has no data, use an empty array []. Always output JSON.`;

/** Extract plain text from a PDF or DOCX blob */
async function extractText(blob: Blob, fileName: string): Promise<string> {
  const buffer = Buffer.from(await blob.arrayBuffer());

  if (fileName.toLowerCase().endsWith('.pdf')) {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    return result.pages.map((p) => p.text).join('\n');
  }

  // DOCX — strip binary, keep printable ASCII
  return buffer.toString('utf8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
}

export async function parseResume(
  db: DB,
  resumeId: string,
  storagePath: string,
  userId: string
): Promise<void> {
  try {
    // Dedup guard — skip if already parsed + embedded
    const existing = await db.query.resumes.findFirst({
      where: and(eq(resumes.id, resumeId), isNull(resumes.embedding)),
    });
    if (!existing) {
      console.log('[resume-parser] Already processed, skipping:', resumeId);
      return;
    }

    // Fetch file from Supabase Storage
    const supabase = await createServiceClient();
    const { data, error } = await supabase.storage
      .from('resumes')
      .download(storagePath);
    if (error || !data) throw new Error(`Storage download failed: ${error?.message}`);

    // Extract plain text from PDF/DOCX
    const fileName = storagePath.split('/').pop() ?? 'resume.pdf';
    const rawText = (await extractText(data, fileName)).replace(/\0/g, '');
    console.log('[resume-parser] Extracted text length:', rawText.length);

    // Parse structure with LLM
    const parseText = await generateText(rawText.slice(0, 8000), SYSTEM_PROMPT, 2048);
    console.log('[resume-parser] LLM response:', parseText?.slice(0, 300));

    const parsed = (() => {
      if (!parseText) return null;
      const jsonMatch = parseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) { console.log('[resume-parser] No JSON match in response'); return null; }
      try {
        return JSON.parse(jsonMatch[0]) as {
          skills: string[];
          tech_stack: string[];
          experience: ParsedExperience;
          education: ParsedEducation;
        };
      } catch {
        return null;
      }
    })();

    // Generate embedding from clean plain text
    const embedding = await generateEmbedding(rawText.slice(0, 8000));

    // Strip null bytes recursively — Postgres UTF8 rejects 0x00
    const clean = (v: unknown): unknown => {
      if (typeof v === 'string') return v.replace(/\0/g, '');
      if (Array.isArray(v)) return v.map(clean);
      if (v && typeof v === 'object') {
        return Object.fromEntries(Object.entries(v).map(([k, val]) => [k, clean(val)]));
      }
      return v;
    };

    const cleanExp = clean(parsed?.experience ?? []) as ParsedExperience;
    const cleanEdu = clean(parsed?.education ?? []) as ParsedEducation;

    // Update resume row — partial update if only parsing succeeded
    await db
      .update(resumes)
      .set({
        rawText: rawText.slice(0, 50_000),
        parsedSkills: parsed
          ? (clean([...(parsed.skills ?? []), ...(parsed.tech_stack ?? [])]) as string[])
          : [],
        parsedExperience: cleanExp,
        parsedEducation: cleanEdu,
        ...(embedding ? { embedding } : {}),
      })
      .where(eq(resumes.id, resumeId));

    await db
      .update(users)
      .set({ resumeParsedAt: new Date() })
      .where(eq(users.id, userId));

    console.log('[resume-parser] Complete for resume:', resumeId);
  } catch (err) {
    console.error('[resume-parser] Failed for resume', resumeId, err);
    // Graceful degradation — resume visible without embedding
  }
}
