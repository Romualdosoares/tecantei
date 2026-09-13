export const KIE_MODELS = [
  "V3_5",
  "V4",
  "V4_5",
  "V4_5PLUS",
  "V4_5ALL",
  "V5",
  "V5_5",
  "V6",
  "V6_MINI",
  "V6_WILD",
] as const;

export type KieModel = (typeof KIE_MODELS)[number];

export type GenerationState =
  | "created"
  | "submitted"
  | "processing"
  | "reconciling"
  | "succeeded"
  | "failed";

export type MusicGenerationRequest = {
  approvedLyrics: string;
  style: string;
  title: string;
  model: KieModel;
  callbackUrl: string;
  durationSeconds?: number;
  vocalGender?: "m" | "f";
};

export type ProviderTrack = {
  id: string;
  audioUrl: string;
  streamAudioUrl: string | null;
  title: string;
  durationSeconds: number;
  modelName: string;
};

export type ProviderTask = {
  externalTaskId: string;
  state: GenerationState;
  providerStatus: string;
  errorCode: string | null;
  tracks: ProviderTrack[];
};

type Fetch = typeof fetch;

export class KieApiError extends Error {
  readonly status: number;
  readonly retryable: boolean;

  constructor(
    message: string,
    status: number,
    retryable: boolean,
  ) {
    super(message);
    this.name = "KieApiError";
    this.status = status;
    this.retryable = retryable;
  }
}

export class KieSubmissionUnknownError extends Error {
  constructor(options?: ErrorOptions) {
    super(
      "Não foi possível confirmar se a Kie.ai aceitou a tarefa; concilie antes de reenviar.",
      options,
    );
    this.name = "KieSubmissionUnknownError";
  }
}

export class KieMusicClient {
  private readonly baseUrl = "https://api.kie.ai";
  private readonly apiKey: string;
  private readonly fetcher: Fetch;

  constructor(
    apiKey: string,
    fetcher: Fetch = fetch,
  ) {
    if (!apiKey.trim()) {
      throw new Error("A chave da Kie.ai é obrigatória no servidor.");
    }
    this.apiKey = apiKey;
    this.fetcher = fetcher;
  }

  async submitGeneration(request: MusicGenerationRequest) {
    validateGenerationRequest(request);

    let response: Response;
    try {
      response = await this.fetcher(`${this.baseUrl}/api/v1/generate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: request.approvedLyrics,
          customMode: true,
          instrumental: false,
          model: request.model,
          callBackUrl: request.callbackUrl,
          style: request.style,
          title: request.title,
          ...(request.vocalGender ? { vocalGender: request.vocalGender } : {}),
          ...(request.durationSeconds
            ? { duration: request.durationSeconds }
            : {}),
        }),
      });
    } catch (error) {
      throw new KieSubmissionUnknownError({ cause: error });
    }

    const payload = await readJson(response);
    if (!response.ok || payload.code !== 200) {
      throw apiError(response, payload);
    }

    const externalTaskId = readString(payload.data, "taskId");
    if (!externalTaskId) {
      throw new KieSubmissionUnknownError();
    }

    return { externalTaskId };
  }

  async getTask(externalTaskId: string): Promise<ProviderTask> {
    if (!externalTaskId.trim()) {
      throw new Error("O identificador externo da tarefa é obrigatório.");
    }

    const url = new URL(`${this.baseUrl}/api/v1/generate/record-info`);
    url.searchParams.set("taskId", externalTaskId);
    const response = await this.fetcher(url, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    const payload = await readJson(response);
    if (!response.ok || payload.code !== 200) {
      throw apiError(response, payload);
    }

    const data = isRecord(payload.data) ? payload.data : {};
    const providerStatus = readString(data, "status") ?? "UNKNOWN";
    const responseData = isRecord(data.response) ? data.response : {};
    const rawTracks = Array.isArray(responseData.sunoData)
      ? responseData.sunoData
      : [];

    return {
      externalTaskId: readString(data, "taskId") ?? externalTaskId,
      state: stateFromKieStatus(providerStatus),
      providerStatus,
      errorCode: readString(data, "errorCode"),
      tracks: rawTracks.flatMap(parseTrack),
    };
  }
}

export function stateFromKieStatus(status: string): GenerationState {
  switch (status) {
    case "PENDING":
    case "TEXT_SUCCESS":
    case "FIRST_SUCCESS":
      return "processing";
    case "SUCCESS":
      return "succeeded";
    case "CREATE_TASK_FAILED":
    case "GENERATE_AUDIO_FAILED":
    case "SENSITIVE_WORD_ERROR":
      return "failed";
    case "CALLBACK_EXCEPTION":
    default:
      return "reconciling";
  }
}

export function advanceGenerationState(
  current: GenerationState,
  incoming: GenerationState,
): GenerationState {
  if (current === "succeeded" || current === "failed") return current;
  if (incoming === "succeeded" || incoming === "failed") return incoming;
  if (incoming === "reconciling") return "reconciling";
  if (current === "reconciling" && incoming === "processing") {
    return "processing";
  }

  const rank: Record<GenerationState, number> = {
    created: 0,
    submitted: 1,
    processing: 2,
    reconciling: 3,
    succeeded: 4,
    failed: 4,
  };
  return rank[incoming] > rank[current] ? incoming : current;
}

function validateGenerationRequest(request: MusicGenerationRequest) {
  const promptLimit = request.model === "V3_5" || request.model === "V4"
    ? 3_000
    : 5_000;
  const styleLimit = request.model === "V3_5" || request.model === "V4"
    ? 200
    : 1_000;
  if (
    !request.approvedLyrics.trim() ||
    request.approvedLyrics.length > promptLimit
  ) {
    throw new Error(`A letra aprovada deve ter entre 1 e ${promptLimit} caracteres.`);
  }
  if (!request.style.trim() || request.style.length > styleLimit) {
    throw new Error(`O estilo deve ter entre 1 e ${styleLimit} caracteres.`);
  }
  if (!request.title.trim() || request.title.length > 80) {
    throw new Error("O título deve ter entre 1 e 80 caracteres.");
  }

  const callback = new URL(request.callbackUrl);
  if (callback.protocol !== "https:") {
    throw new Error("O callback da Kie.ai deve usar HTTPS.");
  }
  if (
    request.durationSeconds !== undefined &&
    request.model !== "V5_5" &&
    request.model !== "V6" &&
    request.model !== "V6_MINI" &&
    request.model !== "V6_WILD"
  ) {
    throw new Error("A duração opcional só é aceita pelos modelos V5.5 ou V6.");
  }
  if (
    request.durationSeconds !== undefined &&
    (request.durationSeconds < 150 || request.durationSeconds > 240)
  ) {
    throw new Error("A duração desejada deve ficar entre 150 e 240 segundos.");
  }
}

function parseTrack(value: unknown): ProviderTrack[] {
  if (!isRecord(value)) return [];
  const id = readString(value, "id");
  const audioUrl = readString(value, "audio_url");
  const duration = value.duration;
  if (!id || !audioUrl || typeof duration !== "number") return [];

  return [{
    id,
    audioUrl,
    streamAudioUrl: readString(value, "stream_audio_url"),
    title: readString(value, "title") ?? "Sem título",
    durationSeconds: duration,
    modelName: readString(value, "model_name") ?? "desconhecido",
  }];
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await response.json();
    return isRecord(value) ? value : {};
  } catch {
    return {};
  }
}

function apiError(response: Response, payload: Record<string, unknown>) {
  const message = typeof payload.msg === "string"
    ? payload.msg
    : "A Kie.ai recusou a solicitação.";
  const retryable = response.status === 429 || response.status >= 500;
  return new KieApiError(message, response.status, retryable);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(
  value: unknown,
  key: string,
): string | null {
  if (!isRecord(value)) return null;
  return typeof value[key] === "string" && value[key]
    ? value[key]
    : null;
}
