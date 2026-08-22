// Bump this whenever the embedding model or preprocessing pipeline changes
// (see Radhe-Beutic-Server's /generate-embedding). Kurti.imageVectorVersion
// is stamped with this value whenever a vector is (re)generated, so the
// generate-vectors migration can tell which products still need re-embedding.
export const CURRENT_EMBEDDING_VERSION = "marqo-fashionclip-v1";
