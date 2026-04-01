declare const __SAHYA_CODE_VERSION__: string | undefined;

export const sahyaCodeVersion =
  typeof __SAHYA_CODE_VERSION__ !== "undefined" && __SAHYA_CODE_VERSION__
    ? __SAHYA_CODE_VERSION__
    : "dev";

// Legacy alias for backward compatibility
export const kimiCliVersion = sahyaCodeVersion;
