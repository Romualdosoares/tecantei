import { z } from "zod";

const trackSchema = z.object({
  id: z.string().trim().min(1).max(200),
  audio_url: z.string().trim().url().max(2_048),
  stream_audio_url: z.string().trim().url().max(2_048).nullable().optional(),
  title: z.string().trim().min(1).max(200).optional(),
  duration: z.number().positive().max(3_600),
  model_name: z.string().trim().min(1).max(100).optional(),
}).superRefine((track, context) => {
  for (const [field, value] of [
    ["audio_url", track.audio_url],
    ["stream_audio_url", track.stream_audio_url],
  ] as const) {
    if (value && new URL(value).protocol !== "https:") {
      context.addIssue({
        code: "custom",
        path: [field],
        message: "A URL de áudio deve usar HTTPS.",
      });
    }
  }
});

const callbackSchema = z.object({
  code: z.number().int().min(100).max(599),
  msg: z.string().max(1_000).optional(),
  data: z.object({
    callbackType: z.enum(["text", "first", "complete", "error"]),
    task_id: z.string().trim().min(1).max(200),
    data: z.array(trackSchema).max(8).optional().default([]),
  }),
});

export type KieGenerationCallback = z.infer<typeof callbackSchema>;

export function parseKieGenerationCallback(value: unknown) {
  return callbackSchema.safeParse(value);
}
