import rawPack from "@/data/market/software-backend-devops-mx-2026.json";
import { currentPracticePackSchema, type CurrentPracticePack } from "@/lib/domain/schemas";

export function validatePracticePack(pack: CurrentPracticePack) {
  const sourceIds = new Set(pack.sources.map((source) => source.id));
  const requirementIds = new Set(pack.requirements.map((requirement) => requirement.id));

  const resourceIds = new Set<string>();
  for (const resource of pack.learningResources) {
    if (resourceIds.has(resource.id)) throw new Error(`Duplicate learning resource ${resource.id}.`);
    resourceIds.add(resource.id);
    // A reading list dated later than the pack itself would misreport when the
    // comparison was made, so resources may be re-checked but never post-dated
    // ahead of an unreviewed pack.
    if (resource.observedAt < pack.observedThrough) throw new Error(`Learning resource ${resource.id} predates the market observation window.`);
  }

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

  // A role profile must be a cluster actually observed in the reviewed
  // postings: every requirement it names has to appear in at least one of the
  // postings it was derived from.
  const profileIds = new Set<string>();
  for (const profile of pack.roleProfiles) {
    if (profileIds.has(profile.id)) throw new Error(`Duplicate role profile ${profile.id}.`);
    profileIds.add(profile.id);
    const observed = new Set<string>();
    for (const sourceId of profile.sourceIds) {
      if (!sourceIds.has(sourceId)) throw new Error(`Role profile ${profile.id} cites unknown posting ${sourceId}.`);
      for (const requirementId of pack.sources.find((item) => item.id === sourceId)?.requirementIds ?? []) observed.add(requirementId);
    }
    for (const requirementId of profile.requirementIds) {
      if (!requirementIds.has(requirementId)) throw new Error(`Role profile ${profile.id} names unknown requirement ${requirementId}.`);
      if (!observed.has(requirementId)) throw new Error(`Role profile ${profile.id} claims ${requirementId}, which none of its cited postings mention.`);
    }
  }

  return pack;
}

export const softwareBackendPracticePack = validatePracticePack(currentPracticePackSchema.parse(rawPack));

const softwareFields = new Set(["software development", "software engineering", "computer science"]);
const softwareTargets = ["backend", "back-end", "full stack", "full-stack", "devops", "software engineer"];
const supportedLocations = ["mexico", "méxico", "latin america", "latam", "remote"];

export function selectCurrentPracticePack(context: { field: string; targetTitle: string; location: string }) {
  const field = context.field.trim().toLowerCase();
  const target = context.targetTitle.trim().toLowerCase();
  const location = context.location.trim().toLowerCase();
  if (!softwareFields.has(field)) return null;
  if (!softwareTargets.some((term) => target.includes(term))) return null;
  if (!supportedLocations.some((term) => location.includes(term))) return null;
  return softwareBackendPracticePack;
}

export function currentPracticePackById(id: string) {
  return id === softwareBackendPracticePack.id ? softwareBackendPracticePack : null;
}

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

export function learningResourceById(pack: CurrentPracticePack, id: string) {
  const resource = pack.learningResources.find((item) => item.id === id);
  if (!resource) throw new Error(`Learning resource ${id} was not found.`);
  return resource;
}
