import rawPack from "@/data/market/software-backend-devops-mx-2026.json";
import { currentPracticePackSchema, type CurrentPracticePack } from "@/lib/domain/schemas";

function validatePack(pack: CurrentPracticePack) {
  const sourceIds = new Set(pack.sources.map((source) => source.id));
  const requirementIds = new Set(pack.requirements.map((requirement) => requirement.id));

  for (const source of pack.sources) {
    for (const requirementId of source.requirementIds) {
      if (!requirementIds.has(requirementId)) throw new Error(`Unknown requirement ${requirementId} in ${source.id}.`);
    }
  }

  for (const requirement of pack.requirements) {
    if (requirement.mentionCount !== requirement.sourceIds.length) throw new Error(`Mention count mismatch for ${requirement.id}.`);
    for (const sourceId of requirement.sourceIds) {
      if (!sourceIds.has(sourceId)) throw new Error(`Unknown market source ${sourceId} in ${requirement.id}.`);
      const source = pack.sources.find((item) => item.id === sourceId);
      if (!source?.requirementIds.includes(requirement.id)) throw new Error(`Non-reciprocal market mapping for ${requirement.id} and ${sourceId}.`);
    }
  }

  return pack;
}

export const softwareBackendPracticePack = validatePack(currentPracticePackSchema.parse(rawPack));

export function requirementById(pack: CurrentPracticePack, id: string) {
  const requirement = pack.requirements.find((item) => item.id === id);
  if (!requirement) throw new Error(`Current-practice requirement ${id} was not found.`);
  return requirement;
}

export function marketSourceById(pack: CurrentPracticePack, id: string) {
  const source = pack.sources.find((item) => item.id === id);
  if (!source) throw new Error(`Market source ${id} was not found.`);
  return source;
}

export function technicalSourceById(pack: CurrentPracticePack, id: string) {
  const source = pack.technicalSources.find((item) => item.id === id);
  if (!source) throw new Error(`Technical source ${id} was not found.`);
  return source;
}
