import type {
  CyberLabAIProvider,
  CyberLabAIProviderFactory,
} from "./provider";

export interface CyberLabAIProviderDefinition {
  id: string;
  displayName: string;
  models: string[];
  create: CyberLabAIProviderFactory;
}

export interface CyberLabAIProviderStatus {
  id: string;
  displayName: string;
  models: string[];
  available: boolean;
}

const providerDefinitions = new Map<
  string,
  CyberLabAIProviderDefinition
>();

export function registerCyberLabAIProvider(
  definition: CyberLabAIProviderDefinition
): void {
  providerDefinitions.set(definition.id, definition);
}

export function getCyberLabAIProvider(
  id: string
): CyberLabAIProvider | null {
  const definition = providerDefinitions.get(id);

  if (!definition) {
    return null;
  }

  return definition.create();
}

export function listCyberLabAIProviders(): CyberLabAIProviderStatus[] {
  return Array.from(providerDefinitions.values()).map(
    (definition) => {
      const provider = definition.create();

      return {
        id: definition.id,
        displayName: definition.displayName,
        models: [...definition.models],
        available: provider !== null,
      };
    }
  );
}

export function getCyberLabAIProviderDefinition(
  id: string
): CyberLabAIProviderDefinition | null {
  return providerDefinitions.get(id) ?? null;
}
