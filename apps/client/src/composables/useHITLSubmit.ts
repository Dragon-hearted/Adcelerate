import { ref } from 'vue';
import type { HookEvent, HumanInTheLoopResponse } from '../types';
import { API_BASE_URL } from '../config';

export function useHITLSubmit(event: () => HookEvent) {
  const responseText = ref('');
  const isSubmitting = ref(false);
  const hasSubmittedResponse = ref(false);
  const localResponse = ref<HumanInTheLoopResponse | null>(null);

  const submit = async (
    responsePart: Partial<Pick<HumanInTheLoopResponse, 'response' | 'permission' | 'choice'>>,
    label: string
  ): Promise<HumanInTheLoopResponse | null> => {
    const ev = event();
    if (!ev.id) return null;

    const response: HumanInTheLoopResponse = {
      ...responsePart,
      hookEvent: ev,
      respondedAt: Date.now()
    };

    // Optimistic UI
    localResponse.value = response;
    hasSubmittedResponse.value = true;
    isSubmitting.value = true;

    try {
      const res = await fetch(`${API_BASE_URL}/events/${ev.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(response)
      });

      if (!res.ok) throw new Error(`Failed to submit ${label}`);
      return response;
    } catch (error) {
      console.error(`Error submitting ${label}:`, error);
      // Rollback optimistic update
      localResponse.value = null;
      hasSubmittedResponse.value = false;
      alert(`Failed to submit ${label}. Please try again.`);
      return null;
    } finally {
      isSubmitting.value = false;
    }
  };

  const submitResponse = async (): Promise<HumanInTheLoopResponse | null> => {
    if (!responseText.value.trim()) return null;
    const savedText = responseText.value;
    responseText.value = '';

    const result = await submit({ response: savedText.trim() }, 'response');
    if (!result) {
      responseText.value = savedText;
    }
    return result;
  };

  const submitPermission = async (approved: boolean): Promise<HumanInTheLoopResponse | null> => {
    return submit({ permission: approved }, 'permission');
  };

  const submitChoice = async (choice: string): Promise<HumanInTheLoopResponse | null> => {
    return submit({ choice }, 'choice');
  };

  return {
    responseText,
    isSubmitting,
    hasSubmittedResponse,
    localResponse,
    submitResponse,
    submitPermission,
    submitChoice
  };
}
