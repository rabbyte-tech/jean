import './ModelSelector.css';

interface ModelSelectorProps {
  models: Array<{
    id: string;
    name: string;
    contextWindow: number;
    tier: 'budget' | 'standard' | 'premium';
    providerId: string;
    providerName: string;
  }>;
  selectedModelId: string | null | undefined;
  onChangeModel: (modelId: string, providerId: string) => void;
  disabled?: boolean;
}

export default function ModelSelector({ 
  models, 
  selectedModelId, 
  onChangeModel,
  disabled 
}: ModelSelectorProps) {
  // Group models by provider for organized display
  const groupedModels = models.reduce((acc, model) => {
    if (!acc[model.providerName]) {
      acc[model.providerName] = [];
    }
    acc[model.providerName].push(model);
    return acc;
  }, {} as Record<string, typeof models>);

  const getTierLabel = (tier: string) => {
    switch (tier) {
      case 'budget': return '$';
      case 'standard': return '$$';
      case 'premium': return '$$$';
      default: return '';
    }
  };

  const handleChange = (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    onChangeModel(modelId, model?.providerId || 'openai');
  };

  return (
    <div className="model-selector">
      <label className="model-selector-label">Model:</label>
      <select
        value={selectedModelId || ''}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        className="model-selector-dropdown"
      >
        {Object.entries(groupedModels).map(([providerName, providerModels]) => (
          <optgroup key={providerName} label={providerName}>
            {providerModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} ({getTierLabel(model.tier)})
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
