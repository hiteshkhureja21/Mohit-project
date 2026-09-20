import { AudienceProfile, OutputDeliverable } from '../types/transformation';
import { initialOutputs } from '../data/demoData';
import { isDemoMode } from '../config/supabase';
import { ApiResponse, apiClient } from './api';

export class GenerationService {
  async generateDeliverables(
    transformationId: string,
    profiles: AudienceProfile[]
  ): Promise<ApiResponse<OutputDeliverable[]>> {
    const selectedTypes = profiles.filter(p => p.isSelected).map(p => p.deliverableType);
    const deliverables = initialOutputs.filter(out => selectedTypes.includes(out.type));
    const fallbackDeliverables = deliverables.length > 0 ? deliverables : initialOutputs;

    return apiClient.post<OutputDeliverable[]>(
      '/outputs/generate',
      {
        transformationId,
        profiles: profiles.filter(p => p.isSelected)
      },
      isDemoMode() ? fallbackDeliverables : undefined
    );
  }
}

export const generationService = new GenerationService();
