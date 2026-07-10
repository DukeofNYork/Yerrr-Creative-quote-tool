import type { BusinessConfig, Presentation, PresentationStyle } from './engine/types';

/**
 * Presentation resolution — the seam between stored config and the customer UI.
 *
 * The PERMANENT default is 'basic-light' (the Foundation Presentation). Until that
 * experience is built (build step 4), we fall back to the only style that has a
 * renderer today — 'creative-studio' (the notebook). This constant flips to
 * 'basic-light' the moment Basic Light ships, so we never point the default at a
 * style that cannot render.
 *
 * The engine does not import this module. Presentation is strictly a UI concern.
 */
export const DEFAULT_PRESENTATION_STYLE: PresentationStyle = 'creative-studio';

/** The effective presentation for a config, applying the temporary default. */
export function resolvePresentation(config: BusinessConfig): Presentation {
  return config.presentation ?? { style: DEFAULT_PRESENTATION_STYLE };
}
