import { readFile, readdir } from 'node:fs/promises';
import * as path from 'node:path';

export type SourceFormat = 'AOPS_TABLE' | 'CLEAN_BLOCK' | 'MIXED';

type ChoiceKey = 'A' | 'B' | 'C' | 'D' | 'E';

export type ParsedProblem = {
  number: number;
  questionText: string;
  options: Partial<Record<ChoiceKey, string>>;
  rawBlock: string;
};

export type ParseResult = {
  format: SourceFormat;
  problems: ParsedProblem[];
  errors: string[];
};

const FORMAT_CHARACTERISTICS: Record<SourceFormat, string[]> = {
  AOPS_TABLE: [
    'Many markdown table row delimiters (`| --- |`).',
    'AoPS header rows repeated across pages.',
    'Question numbers frequently appear in table columns.'
  ],
  CLEAN_BLOCK: [
    'Mostly plain text question blocks with direct numbering.',
    'Limited or no heavy table separators.',
    'Choices are typically inline as (A)...(E).'
  ],
  MIXED: [
    'Contains OCR/form-feed artifacts and multi-layout pages.',
    'Question numbering and choices can be split across lines.',
    'May include both inline and vertical choice layouts.'
  ]
};

export function detectFormat(fileContent: string): SourceFormat {
  const tableRows = (fileContent.match(/^\|/gm) ?? []).length;
  const tableDividers = (fileContent.match(/^\|\s*-{2,}/gm) ?? []).length;
  const formFeeds = (fileContent.match(/\f/g) ?? []).length;
  const inlineChoices = (fileContent.match(/\([A-E]\)/g) ?? []).length;

  const looksMixed = formFeeds > 0 || (inlineChoices < 10 && tableRows < 20);
  if (looksMixed) {
    return 'MIXED';
  }

  const hasAopsHeader = /AoPS\s*\|\s*Community/.test(fileContent);
  const looksAopsTable = hasAopsHeader && (tableRows > 40 || tableDividers > 20);
  if (looksAopsTable) {
    return 'AOPS_TABLE';
  }

  return 'CLEAN_BLOCK';
}

function normalize(text: string): string {
  return text
    .replace(/\r/g, '')
    .replace(/\f/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitBlocksByQuestion(lines: string[], headerPatterns: RegExp[]): Map<number, string[]> {
  const buckets = new Map<number, string[]>();
  let currentNumber: number | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    let matchedNumber: number | null = null;

    for (const pattern of headerPatterns) {
      const match = trimmed.match(pattern);
      if (match) {
        matchedNumber = Number(match[1]);
        break;
      }
    }

    if (matchedNumber !== null && matchedNumber >= 1 && matchedNumber <= 25) {
      currentNumber = matchedNumber;
      if (!buckets.has(currentNumber)) {
        buckets.set(currentNumber, []);
      }
    }

    if (currentNumber !== null) {
      buckets.get(currentNumber)?.push(line);
    }
  }

  return buckets;
}

function extractInlineChoices(blockText: string): Partial<Record<ChoiceKey, string>> {
  const options: Partial<Record<ChoiceKey, string>> = {};
  const choicePattern = /\(([A-E])\)\s*([\s\S]*?)(?=\([A-E]\)|$)/g;

  let match = choicePattern.exec(blockText);
  while (match) {
    const key = match[1] as ChoiceKey;
    const value = normalize(match[2]).replace(/^\|+|\|+$/g, '');
    if (value.length > 0) {
      options[key] = value;
    }
    match = choicePattern.exec(blockText);
  }

  return options;
}

function extractVerticalChoices(lines: string[]): Partial<Record<ChoiceKey, string>> {
  const options: Partial<Record<ChoiceKey, string>> = {};
  let pendingKey: ChoiceKey | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    const singleKey = trimmed.match(/^[A-E]$/);
    if (singleKey) {
      pendingKey = singleKey[0] as ChoiceKey;
      if (!(pendingKey in options)) {
        options[pendingKey] = '';
      }
      continue;
    }

    if (pendingKey) {
      if (trimmed.length === 0) {
        continue;
      }

      options[pendingKey] = normalize(`${options[pendingKey] ?? ''} ${trimmed}`);
      const hasSubstantialText = (options[pendingKey] ?? '').length >= 2;
      if (hasSubstantialText) {
        pendingKey = null;
      }
    }
  }

  return options;
}

function buildProblems(buckets: Map<number, string[]>, strategy: SourceFormat): ParseResult {
  const problems: ParsedProblem[] = [];
  const errors: string[] = [];

  for (let number = 1; number <= 25; number += 1) {
    const blockLines = buckets.get(number);
    if (!blockLines || blockLines.length === 0) {
      errors.push(`Missing problem ${number}`);
      continue;
    }

    const rawBlock = normalize(blockLines.join('\n'));
    const inlineOptions = extractInlineChoices(rawBlock);
    const options = Object.keys(inlineOptions).length > 0
      ? inlineOptions
      : extractVerticalChoices(blockLines);

    const questionText = normalize(
      rawBlock
        .replace(/\([A-E]\)[\s\S]*/g, '')
        .replace(/\|/g, ' ')
        .replace(/^\d{1,2}[.)]?\s*/, '')
    );

    if (questionText.length === 0) {
      errors.push(`Problem ${number} has empty question text (${strategy})`);
    }

    if (Object.keys(options).length < 5) {
      errors.push(`Problem ${number} has incomplete choices (${strategy})`);
    }

    problems.push({ number, questionText, options, rawBlock });
  }

  return { format: strategy, problems, errors };
}

export function parseAopsTableFormat(fileContent: string): ParseResult {
  const cleaned = normalize(fileContent);
  const lines = cleaned.split('\n');
  const buckets = splitBlocksByQuestion(lines, [
    /^\|\s*(\d{1,2})\s*\|/,
    /^(\d{1,2})\s*$/,
    /^(\d{1,2})[.)]\s+/
  ]);

  return buildProblems(buckets, 'AOPS_TABLE');
}

export function parseCleanBlockFormat(fileContent: string): ParseResult {
  const cleaned = normalize(fileContent);
  const lines = cleaned.split('\n');
  const buckets = splitBlocksByQuestion(lines, [
    /^(\d{1,2})[.)]\s+/,
    /^\|\s*(\d{1,2})\s*\|/,
    /^(\d{1,2})\s+\S/
  ]);

  return buildProblems(buckets, 'CLEAN_BLOCK');
}

export function parseMixedFormat(fileContent: string): ParseResult {
  const cleaned = normalize(fileContent);
  const lines = cleaned.split('\n');
  const buckets = splitBlocksByQuestion(lines, [
    /^(\d{1,2})[.)]\s+/,
    /^(\d{1,2})\s*$/,
    /^\|\s*(\d{1,2})\s*\|/
  ]);

  return buildProblems(buckets, 'MIXED');
}

export function parseMarkdown(fileContent: string): ParseResult {
  const format = detectFormat(fileContent);
  const parser = {
    AOPS_TABLE: parseAopsTableFormat,
    CLEAN_BLOCK: parseCleanBlockFormat,
    MIXED: parseMixedFormat
  }[format];

  return parser(fileContent);
}

async function parseDirectory(dirPath: string): Promise<void> {
  const names = await readdir(dirPath);
  const files = names
    .filter((name) => /^AMC8_\d{4}\.md$/.test(name))
    .sort((a, b) => a.localeCompare(b));

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const content = await readFile(fullPath, 'utf8');
    const format = detectFormat(content);
    const result = parseMarkdown(content);

    console.log(`[markdown-parser] ${file} format=${format} parsed=${result.problems.length} errors=${result.errors.length}`);
    if (result.errors.length > 0) {
      console.log(`[markdown-parser] ${file} errors: ${result.errors.slice(0, 5).join('; ')}`);
    }
  }
}

if (process.argv[1] && process.argv[1].includes('markdown-parser')) {
  console.log('[markdown-parser] Format families:', FORMAT_CHARACTERISTICS);
  parseDirectory(path.join('content', 'amc8', 'markdown')).catch((error: unknown) => {
    console.error('[markdown-parser] Failed:', error);
    process.exit(1);
  });
}
