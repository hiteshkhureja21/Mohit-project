import { EmailRecipient } from '../types/transformation';
import { isDemoMode } from '../config/supabase';
import { simulateDelay, createApiResponse, ApiResponse, apiClient } from './api';

export interface DispatchResult {
  transformationId: string;
  sentAt: string;
  recipientCount: number;
  messageId: string;
  dispatchStatus: 'DELIVERED_SIMULATED' | 'SENT';
}

export class DeliveryService {
  async sendCommunication(
    transformationId: string,
    payload: {
      recipients: EmailRecipient[];
      subject: string;
      message: string;
    }
  ): Promise<ApiResponse<DispatchResult>> {
    const fallbackResult: DispatchResult = {
      transformationId,
      sentAt: new Date().toISOString(),
      recipientCount: payload.recipients.length,
      messageId: `MSG-SF-${Date.now().toString().slice(-6)}`,
      dispatchStatus: 'SENT'
    };

    return apiClient.post<DispatchResult>(
      '/delivery/send',
      {
        transformationId,
        ...payload
      },
      isDemoMode() ? fallbackResult : undefined
    );
  }
}

export const deliveryService = new DeliveryService();
