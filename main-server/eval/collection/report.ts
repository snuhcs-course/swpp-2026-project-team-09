/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-02  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type Tokens } from '../cost.ts';
import { type RunName, type RunOutcome, type RunScore } from './run.ts';
import { type FieldScore, type Rate, type ScoreA } from './score-a.ts';
import { type ScoreB } from './score-b.ts';

// The record of a run (metrics document, 4.3) and the rows of its failure analysis (4.6). What only a person knows, such
// as who approved it, goes into the ticket beside it.

export interface RunRecord {
  run: RunName;
  command: string;
  commit: string;
  c0Tag: string;
  isDescendantOfC0: boolean;
  setHash: string;
  thresholdsBlob: string;
  startedAt: string;
  endedAt: string;
  part: string;
  modelAsked: string;
  canonicalSlug: string | null;
  modelsAnswered: string[];
  limits: { timeoutMs: number; maxOutputTokens: number };
  switches: Record<string, boolean | string>;
  campusDefault: Record<string, string | null>;
  checks: readonly string[];
  from: string | null;
  usage: { calls: number; tokens: Tokens; costUsd: number };
  budgetUsd: number;
  pricesSource: string;
}

function rate({ k, n }: Rate): string {
  return n === 0 ? `${k}/${n}` : `${k}/${n} (${((100 * k) / n).toFixed(1)}%)`;
}

function field(name: string, { precision, recall, madeUp }: FieldScore): string {
  return `| ${name} | ${rate(precision)} | ${rate(recall)} | ${rate(madeUp)} |`;
}

function scoresOfA({ c1, c2, c3, c4, c5, c6, c7 }: ScoreA): string[] {
  return [
    '| 지표 | 값 |',
    '|---|---|',
    `| C1 무인 발행률 | ${rate(c1)} |`,
    `| C2 틀린 발행 | ${rate(c2)} |`,
    `| C3 틀린 장소 (발행된 회차, 판정) | ${c3.published} |`,
    `| C3 진단 (검사에 떨어진 회차 포함) | ${c3.allGiven} |`,
    `| C4 스키마 유효 | ${c4.schema === null ? 'n/a (모델 없음)' : rate(c4.schema)} |`,
    `| C4 호출 실패 | ${c4.failedCalls} |`,
    `| C5 행사가 아닌 글의 발행 | ${c5} |`,
    `| C6 기간형 여부 | ${rate(c6)} |`,
    `| C7 신청 기간을 행사 시각으로 발행 | ${c7} |`,
    '',
    '| C4 필드 | 정밀도 | 재현율 | 지어낸 값 |',
    '|---|---|---|---|',
    field('시작', c4.start),
    field('끝', c4.end),
    field('장소', c4.place),
    `| 행사 여부 | ${rate(c4.announcesEvent.precision)} | ${rate(c4.announcesEvent.recall)} | — |`,
  ];
}

function shown(value: number | null): string {
  return value === null ? 'n/a' : value.toFixed(3);
}

function scoresOfB({ d1, d2, recallWithQueue, d3, d4, d5, d6 }: ScoreB): string[] {
  return [
    '| 지표 | 값 |',
    '|---|---|',
    `| D1 잘못된 자동 병합 | ${d1} |`,
    `| D2 TP / FP / FN | ${d2.tp} / ${d2.fp} / ${d2.fn} |`,
    `| D2 정밀도 / 재현율 / F1 | ${shown(d2.precision)} / ${shown(d2.recall)} / ${shown(d2.f1)} |`,
    `| D2 관리자 큐 포함 재현율 | ${rate(recallWithQueue)} |`,
    `| D3 후보 단계 (Pair Completeness) | ${rate(d3)} |`,
    `| D4 관리자 큐 비율 | ${rate(d4)} |`,
    `| D4 이유별 | ${JSON.stringify(d4.byHold)} |`,
    `| D5 다대일 묶음 | ${rate(d5)} |`,
    `| D6 자동 붙이기 재현율 | ${rate(d6)} |`,
  ];
}

function scoreLines(score: RunScore): string[] {
  return 'a' in score ? scoresOfA(score.a) : scoresOfB(score.b);
}

function failureLines(score: RunScore): string[] {
  const rows =
    'a' in score
      ? score.a.rows.map(
          ({ id, session, failed, cause }) =>
            `| ${id}${session === null ? '' : ` (${session})`} | ${failed} | ${cause} | |`,
        )
      : score.b.rows.map(({ id, failed, cause }) => `| ${id} | ${failed} | ${cause} | |`);
  return [
    '| 실패한 항목 | 실패한 검사 | 원인 분류 (자동, 사람이 확인) | 다음 run에서 바꾸는 것 |',
    '|---|---|---|---|',
    ...rows,
  ];
}

function recordLines(record: RunRecord): string[] {
  const { tokens, costUsd, calls } = record.usage;
  return [
    '| 항목 | 값 |',
    '|---|---|',
    `| 명령 | \`${record.command}\` |`,
    `| 시각 | ${record.startedAt} – ${record.endedAt} |`,
    `| 커밋 | \`${record.commit}\` |`,
    `| 고정 세트 | 태그 \`${record.c0Tag}\`의 후손: ${record.isDescendantOfC0 ? '예' : '아니요'}. 정렬한 id의 SHA-256 \`${record.setHash}\`, ${record.part} |`,
    `| threshold 파일 | blob \`${record.thresholdsBlob}\` |`,
    `| 모델 | 요청 \`${record.modelAsked}\`, 목록의 canonical \`${record.canonicalSlug ?? '없음'}\`, 응답 \`${record.modelsAnswered.join(', ') || '없음'}\` |`,
    `| 실행 제한 | ${record.limits.timeoutMs} ms, 출력 ${record.limits.maxOutputTokens} 토큰, 재시도 없음, 글당 한 번. 공급자 기본 디코딩 |`,
    `| 켠 설정 | ${JSON.stringify(record.switches)} |`,
    `| 캠퍼스 설정 | campusDefault ${JSON.stringify(record.campusDefault)} |`,
    `| 켠 검사 | ${record.checks.join(', ')} |`,
    `| 다시 쓴 답 | ${record.from ?? '없음'} |`,
    `| 사용량과 비용 | 호출 ${calls}, 입력 ${tokens.inputTokens} (캐시 읽기 ${tokens.cacheReadTokens}, 쓰기 ${tokens.cacheWriteTokens}), 출력 ${tokens.outputTokens}, USD ${costUsd.toFixed(4)} (${record.pricesSource}), 예산 USD ${record.budgetUsd} |`,
  ];
}

export function reportOf(record: RunRecord, outcome: RunOutcome): string {
  const { score, verdicts, stopped } = outcome;
  const verdictLines = [
    '| threshold | 종류 | 값 | 이번 | 판정 |',
    '|---|---|---|---|---|',
    ...verdicts.map(
      ({ id, kind, threshold, measured, result }) => `| ${id} | ${kind} | ${threshold} | ${measured} | ${result} |`,
    ),
  ];
  return [
    `# 수집 평가 run: ${record.run}`,
    '',
    ...(stopped === null ? [] : [`**끝까지 돌지 못했습니다:** ${stopped}`, '']),
    '## 실행 기록',
    '',
    ...recordLines(record),
    ...(score === null
      ? []
      : [
          '',
          '## 점수',
          '',
          ...scoreLines(score),
          '',
          '## threshold',
          '',
          ...verdictLines,
          '',
          '## failure analysis',
          '',
          ...failureLines(score),
        ]),
    '',
  ].join('\n');
}
