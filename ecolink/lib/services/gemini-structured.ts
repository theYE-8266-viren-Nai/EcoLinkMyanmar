import { z } from "zod";

type JsonSchema = Record<string, unknown>;

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string };
};

export async function generateGeminiStructured<T>(input: {
  apiKey: string;
  model: string;
  prompt: string;
  file: File;
  responseSchema: JsonSchema;
  outputSchema: z.ZodType<T>;
}): Promise<T> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(input.model)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": input.apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [
          { text: input.prompt },
          { inlineData: { mimeType: input.file.type, data: Buffer.from(await input.file.arrayBuffer()).toString("base64") } },
        ] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: input.responseSchema,
          temperature: 0.1,
        },
      }),
    },
  );

  const payload = await response.json() as GeminiResponse;
  if (!response.ok) {
    const error = new Error(payload.error?.message ?? "Gemini request failed") as Error & { statusCode: number };
    error.statusCode = response.status;
    throw error;
  }

  const text = payload.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
  if (!text) throw new Error("Gemini returned an empty structured response.");
  return input.outputSchema.parse(JSON.parse(text));
}
