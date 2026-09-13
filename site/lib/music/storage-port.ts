export type StoredAudioObject = {
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
};

export type AudioWriteOptions = {
  httpMetadata: { contentType: "audio/mpeg" };
  customMetadata?: Record<string, string>;
};

export type AudioBucketWriter = {
  put(
    key: string,
    value: Uint8Array,
    options: AudioWriteOptions,
  ): Promise<unknown>;
};

export type AudioBucket = AudioBucketWriter & {
  get(key: string): Promise<StoredAudioObject | null>;
};
