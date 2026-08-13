/**
 * Adaptador de transcripción de voz a texto (motor externo). El cliente NUNCA lo llama
 * directamente; solo el backend (Principio VI). Implementación stub/mock para el MVP: interpreta
 * el payload de audio como el texto ya transcrito (útil para pruebas y demos, mismo patrón que
 * StubEventExtractionAdapter). El motor real de voz a texto se decide en una spec de
 * backend/integración (research.md R3).
 */
export interface VoiceTranscriptionAdapter {
  /** Devuelve el texto transcrito, o null si no se puede transcribir con fiabilidad (FR-009). */
  transcribir(audio: string): Promise<string | null>;
}

export class StubVoiceTranscriptionAdapter implements VoiceTranscriptionAdapter {
  async transcribir(audio: string): Promise<string | null> {
    if (!audio || !audio.trim() || audio.trim().toLowerCase() === 'ilegible') return null;
    return audio.trim();
  }
}
