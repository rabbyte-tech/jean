import modelsConfig from './models.json';

export interface ModelDefinition {
  id: string;
  name: string;
  contextWindow: number;
  tier: 'budget' | 'standard' | 'premium';
}

export interface ProviderDefinition {
  id: string;
  name: string;
  models: ModelDefinition[];
}

export interface ModelsConfig {
  providers: ProviderDefinition[];
  defaultModel: string;
  defaultProvider: string;
}

export function getModelsConfig(): ModelsConfig {
  return modelsConfig as ModelsConfig;
}

export function getAllModels(): Array<ModelDefinition & { providerId: string; providerName: string }> {
  const allModels: Array<ModelDefinition & { providerId: string; providerName: string }> = [];
  
  for (const provider of modelsConfig.providers) {
    for (const model of provider.models) {
      allModels.push({
        ...model,
        providerId: provider.id,
        providerName: provider.name,
      } as ModelDefinition & { providerId: string; providerName: string });
    }
  }
  
  return allModels;
}

export function findModel(modelId: string): (ModelDefinition & { providerId: string; providerName: string }) | undefined {
  return getAllModels().find(m => m.id === modelId);
}

export { modelsConfig };
