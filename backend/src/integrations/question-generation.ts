/**
 * Adaptador de generación de preguntas (motor externo). El cliente NUNCA lo llama directamente;
 * solo el backend (Principio VI). Implementación stub/mock para el MVP: genera preguntas
 * deterministas a partir del tema y los ponentes; el motor real (LLM u otro) se decide en una
 * spec de backend/integración (research.md R2).
 */
export interface QuestionGenerationAdapter {
  /** Devuelve preguntas generales y técnicas, o null si no hay tema suficiente (FR-004). */
  generar(tema: string | null, ponentes: string[]): Promise<string[] | null>;
}

export class StubQuestionGenerationAdapter implements QuestionGenerationAdapter {
  async generar(tema: string | null, ponentes: string[]): Promise<string[] | null> {
    if (!tema || !tema.trim()) return null;
    const t = tema.trim();
    const generales = [
      `¿Qué es lo que más te está aportando de "${t}" hasta ahora?`,
      `¿Cómo encaja "${t}" con lo que tú estás intentando resolver?`,
    ];
    const tecnicas = [
      `¿Qué retos técnicos os habéis encontrado al aplicar ${t}?`,
      `¿Qué herramientas recomendáis para empezar con ${t}?`,
    ];
    const paraPonente =
      ponentes.length > 0
        ? [`${ponentes[0]}, ¿qué recurso recomendarías para profundizar en ${t}?`]
        : [];
    return [...generales, ...tecnicas, ...paraPonente];
  }
}
