export type PlatformKey = "mac-arm64" | "mac-x64" | "win-x64" | "linux-x64";

export type PlatformEntry = {
  /** File name of the release asset */
  asset: string;
  sha256: string;
};

export type PackageEntry = {
  name: string;
  version: string;
  sha256: string;
};

export type TypstLock = {
  version: string;
  platforms: Record<PlatformKey, PlatformEntry>;
  packages: PackageEntry[];
};

/** Content of the marker file next to a fetched file, it records which entry of the lock file the content matches. */
export type Marker = { version: string; sha256: string };
