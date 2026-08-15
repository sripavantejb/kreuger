// Shared stage vocabulary — Scenario 4 of BUILD_SPEC.md.
// Stage 1 and the terminal stage are fixed; the production stages in
// between are whatever departments exist, in sequence order.

export const PROCUREMENT_STAGE = "Procuring raw material";
export const FINISHED_GOODS_STAGE = "Finished goods";

export function buildStageList(departmentNamesInSequence: string[]): string[] {
  return [PROCUREMENT_STAGE, ...departmentNamesInSequence, FINISHED_GOODS_STAGE];
}

export function nextStage(stageList: string[], current: string): string | null {
  const i = stageList.indexOf(current);
  if (i === -1 || i === stageList.length - 1) return null;
  return stageList[i + 1];
}

export function isTerminalStage(stage: string): boolean {
  return stage === FINISHED_GOODS_STAGE;
}
