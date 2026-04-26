import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const MARKDOWN_DIR = path.join(ROOT_DIR, 'content', 'amc8', 'markdown');
const NORMALIZED_DIR = path.join(ROOT_DIR, 'content', 'amc8', 'normalized');
const IMAGES_DIR = path.join(MARKDOWN_DIR, 'images');
const YEAR_MIN = 1999;
const YEAR_MAX = 2025;

const PROBLEM_REGEX = /(^|\n)(?:\|\s*)?(?<num>[1-9]|1\d|2[0-5])(?:\s*\|)?\s+(?<body>[\s\S]*?)\(A\)\s*(?<A>[\s\S]*?)\(B\)\s*(?<B>[\s\S]*?)\(C\)\s*(?<C>[\s\S]*?)\(D\)\s*(?<D>[\s\S]*?)\(E\)\s*(?<E>[\s\S]*?)(?=(?:\n(?:\|\s*)?(?:[1-9]|1\d|2[0-5])(?:\s*\|)?\s+)|$)/g;

function cleanText(value) {
  return String(value)
    .replace(/\|/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\[img[^\]]*\]/gi, ' ')
    .replace(/\[\/img\]/gi, ' ')
    .replace(/[\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s([,.;:!?])/g, '$1')
    .trim();
}

function extractImageRefs(text) {
  const refs = new Set();
  for (const match of text.matchAll(/!\[\[(?<name>AMC8_\d{4}_p\d+\.(?:png|jpg|jpeg|webp))[^\]]*\]\]/gi)) {
    refs.add(`content/amc8/markdown/images/${match.groups.name}`);
  }
  for (const match of text.matchAll(/https?:\/\/\S*?(?<name>AMC8[_-]\d{4}[_-]p\d+\.(?:png|jpg|jpeg|webp))/gi)) {
    refs.add(`content/amc8/markdown/images/${match.groups.name.replace(/-/g, '_')}`);
  }
  return Array.from(refs).sort();
}


function extractLegacyBlocks(markdown) {
  const lines = markdown.replace(//g, '\n').split('\n');
  const starts = [];
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(/^\s*(?:\|\s*)?([1-9]|1\d|2[0-5])(?:\s*[.|]|\s+|\s*\|$)/);
    if (m) starts.push({ index: i, number: Number(m[1]) });
  }
  const blocks = new Map();
  for (let i = 0; i < starts.length; i += 1) {
    const start = starts[i];
    const end = starts[i + 1]?.index ?? lines.length;
    const chunk = lines.slice(start.index, end).join('\n');
    if (!blocks.has(start.number) || blocks.get(start.number).length < chunk.length) {
      blocks.set(start.number, chunk);
    }
  }
  return blocks;
}

function parseLegacyProblems(markdown, year, sourceMarkdown) {
  const problems = [];
  for (const match of markdown.matchAll(PROBLEM_REGEX)) {
    const number = Number(match.groups?.num);
    if (!Number.isInteger(number) || number < 1 || number > 25) continue;

    const problem = {
      problem_id: `amc8-${year}-${String(number).padStart(2, '0')}`,
      contest: 'AMC8',
      year,
      problem_number: number,
      question_text_raw: cleanText(match.groups?.body ?? ''),
      options: {
        A: cleanText(match.groups?.A ?? ''),
        B: cleanText(match.groups?.B ?? ''),
        C: cleanText(match.groups?.C ?? ''),
        D: cleanText(match.groups?.D ?? ''),
        E: cleanText(match.groups?.E ?? ''),
      },
      image_refs: extractImageRefs(match[0]),
      answer: null,
      explanation: null,
      source_markdown: sourceMarkdown,
      parse_status: 'parsed',
    };

    if (problem.question_text_raw && Object.values(problem.options).every(Boolean)) {
      problems.push(problem);
    }
  }

  const deduped = new Map();
  for (const problem of problems) deduped.set(problem.problem_number, problem);

  const coarseBlocks = extractLegacyBlocks(markdown);
  for (let number = 1; number <= 25; number += 1) {
    if (deduped.has(number)) continue;
    const block = coarseBlocks.get(number);
    if (!block) continue;

    const text = cleanText(block.replace(/^\s*(?:\|\s*)?([1-9]|1\d|2[0-5])(?:\s*[.|]|\s+)?/, ''));
    if (!text) continue;

    deduped.set(number, {
      problem_id: `amc8-${year}-${String(number).padStart(2, '0')}`,
      contest: 'AMC8',
      year,
      problem_number: number,
      question_text_raw: text,
      options: {
        A: 'Option A',
        B: 'Option B',
        C: 'Option C',
        D: 'Option D',
        E: 'Option E',
      },
      image_refs: extractImageRefs(block),
      answer: null,
      explanation: 'Auto-filled placeholder; OCR cleanup needed.',
      source_markdown: sourceMarkdown,
      parse_status: 'placeholder',
    });
  }

  return Array.from(deduped.values()).sort((a, b) => a.problem_number - b.problem_number);
}

function parse2025Problems(markdown, sourceMarkdown) {
  const answerMap = new Map();
  for (const m of markdown.matchAll(/\|\s*(\d{1,2})\s*\|\s*\*\*([A-E])\*\*\s*\|/g)) {
    answerMap.set(Number(m[1]), m[2]);
  }

  const headerCut = ('\n' + markdown.split('## Answer Key')[0]).replace(/\f/g, '\n');
  const problems = [];

  for (let number = 1; number <= 25; number += 1) {
    const currentPattern = new RegExp(`\\n\\s*${number}\\.\\s`);
    const currentMatch = currentPattern.exec(headerCut);
    const nextPattern = number < 25 ? new RegExp(`\\n\\s*${number + 1}\\.\\s`) : null;

    const start = currentMatch?.index ?? -1;
    if (start === -1) continue;

    const searchStart = start + (currentMatch?.[0]?.length ?? 0);
    const nextMatch = nextPattern ? nextPattern.exec(headerCut.slice(searchStart)) : null;
    const end = nextMatch ? searchStart + nextMatch.index : headerCut.length;
    const block = headerCut.slice(start + 1, end);

    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    let idx = -1;
    for (let i = 0; i <= lines.length - 5; i += 1) {
      if (lines[i] === 'A' && lines[i + 1] === 'B' && lines[i + 2] === 'C' && lines[i + 3] === 'D' && lines[i + 4] === 'E') {
        idx = i;
        break;
      }
    }
    if (idx === -1) continue;

    const questionText = cleanText(lines.slice(0, idx).join(' ').replace(/^\d{1,2}\.\s*/, ''));
    let optLines = lines.slice(idx + 5, idx + 10);
    if (optLines.length < 5) {
      optLines = ['Option A', 'Option B', 'Option C', 'Option D', 'Option E'];
    }

    problems.push({
      problem_id: `amc8-2025-${String(number).padStart(2, '0')}`,
      contest: 'AMC8',
      year: 2025,
      problem_number: number,
      question_text_raw: questionText || `Problem ${number} text requires OCR cleanup.`,
      options: {
        A: cleanText(optLines[0]) || 'Option A',
        B: cleanText(optLines[1]) || 'Option B',
        C: cleanText(optLines[2]) || 'Option C',
        D: cleanText(optLines[3]) || 'Option D',
        E: cleanText(optLines[4]) || 'Option E',
      },
      image_refs: extractImageRefs(block),
      answer: answerMap.get(number) ?? null,
      explanation: null,
      source_markdown: sourceMarkdown,
      parse_status: optLines.includes('Option A') ? 'placeholder' : 'parsed',
    });
  }

  return problems.sort((a, b) => a.problem_number - b.problem_number);
}

async function main() {
  await fs.mkdir(NORMALIZED_DIR, { recursive: true });
  const markdownFiles = new Set((await fs.readdir(MARKDOWN_DIR)).filter((file) => /^AMC8_\d{4}\.md$/.test(file)));
  const allProblems = [];

  for (let year = YEAR_MIN; year <= YEAR_MAX; year += 1) {
    const file = `AMC8_${year}.md`;
    const outPath = path.join(NORMALIZED_DIR, `AMC8_${year}.json`);

    if (!markdownFiles.has(file)) {
      await fs.writeFile(outPath, '[]\n', 'utf8');
      continue;
    }

    const sourceMarkdown = `content/amc8/markdown/${file}`;
    const markdown = await fs.readFile(path.join(MARKDOWN_DIR, file), 'utf8');
    const yearProblems = year === 2025 ? parse2025Problems(markdown, sourceMarkdown) : parseLegacyProblems(markdown, year, sourceMarkdown);
    allProblems.push(...yearProblems);
    await fs.writeFile(outPath, `${JSON.stringify(yearProblems, null, 2)}\n`, 'utf8');
  }

  await fs.writeFile(path.join(NORMALIZED_DIR, 'all-problems.json'), `${JSON.stringify(allProblems, null, 2)}\n`, 'utf8');

  const imageFiles = new Set(await fs.readdir(IMAGES_DIR));
  let unresolved = 0;
  for (const problem of allProblems) {
    for (const ref of problem.image_refs) {
      if (!imageFiles.has(path.basename(ref))) unresolved += 1;
    }
  }

  console.log(`Generated ${allProblems.length} normalized problems across ${YEAR_MAX - YEAR_MIN + 1} expected years.`);
  console.log(`Unresolved image refs: ${unresolved}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
