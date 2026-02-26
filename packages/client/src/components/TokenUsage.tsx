import { getModelContextWindow } from '@jean2/shared';
import './TokenUsage.css';

interface TokenUsageProps {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  modelName: string;
  contextWindow?: number;  // Actual context window from model config
}

export default function TokenUsage({
  /* eslint-disable @typescript-eslint/no-unused-vars */
  promptTokens,
  /* eslint-disable @typescript-eslint/no-unused-vars */
  completionTokens,
  totalTokens,
  modelName,
  contextWindow: contextWindowProp
}: TokenUsageProps) {
  // Use passed contextWindow if provided, otherwise fall back to lookup
  const actualContextWindow = contextWindowProp ?? getModelContextWindow(modelName);

  // If no LLM interaction yet (totalTokens === 0), show context as 0
  // Otherwise, show the actual context window from the model
  const contextWindow = totalTokens === 0 ? 0 : actualContextWindow;
  const percentage = contextWindow === 0 ? 0 : Math.min(100, Math.round((totalTokens / contextWindow) * 100));

  // Determine color based on usage percentage
  const getColorClass = () => {
    if (percentage >= 60) return 'critical';
    if (percentage >= 40) return 'warning';
    return 'normal';
  };

  // Format numbers with k/m suffix for compact display
  const formatCompact = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  return (
    <div className="token-usage">
      <div className="token-row">
        <span className="token-label">Total:</span>
        <span className="token-count">
          {formatCompact(totalTokens)}/{formatCompact(contextWindow)}
        </span>
      </div>
      <div className="token-row">
        <div className="token-bar-container">
          <div
            className={`token-bar ${getColorClass()}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="token-percentage">({percentage}%)</span>
      </div>
    </div>
  );
}
