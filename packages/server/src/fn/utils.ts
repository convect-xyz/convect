import path from "path";

export function getManifestBucket() {
  return "ingest-fetch-logs";
}

export function getManifestPrefix(functionId: number, deploymentId: string) {
  return path.join("manifests", functionId.toString(), deploymentId + ".json");
}

export function getCodeBucket() {
  return "ingest-build-outputs";
}

export function getCodePrefix(functionId: number, deploymentId: string) {
  return path.join("code", functionId.toString(), deploymentId + ".zip");
}
