/**
 * Encrypted storage service
 * Provides client-side encrypted data storage functionality with support for multiple storage backends
 */
import {
  CRYPTO_CONFIG,
  type EncryptedSecret,
  decryptSecret,
  encryptSecret,
  isWebCryptoSupported,
} from "./webCryptoUtils";

/**
 * Storage backend types
 */
export type StorageBackend = "localStorage" | "sessionStorage" | "indexedDB";

/**
 * Storage configuration
 */
export interface StorageConfig {
  backend: StorageBackend;
  keyPrefix: string;
  compression: boolean;
  enableBackup: boolean;
  maxEntries: number;
  entryTTL: number; // milliseconds
}

/**
 * Storage entry metadata
 */
export interface StorageEntryMetadata {
  key: string;
  createdAt: number;
  lastAccessed: number;
  expiresAt: number;
  size: number;
  compressed: boolean;
  tags: string[];
}

/**
 * Encrypted storage entry
 */
export interface EncryptedStorageEntry {
  metadata: StorageEntryMetadata;
  encryptedData: EncryptedSecret;
  checksum: string;
}

/**
 * Storage statistics
 */
export interface StorageStats {
  totalEntries: number;
  totalSize: number;
  expiredEntries: number;
  compressionRatio: number;
  oldestEntry: number;
  newestEntry: number;
}

/**
 * Default storage configuration
 */
const DEFAULT_CONFIG: StorageConfig = {
  backend: "localStorage",
  keyPrefix: "sui_fusion_encrypted_",
  compression: true,
  enableBackup: false,
  maxEntries: 100,
  entryTTL: 24 * 60 * 60 * 1000, // 24 hours
};

/**
 * Encrypted storage service class
 */
export class EncryptedStorageService {
  private config: StorageConfig;
  private backendAdapter: StorageAdapter;

  constructor(config: Partial<StorageConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.backendAdapter = this.createBackendAdapter();
  }

  /**
   * Store encrypted data
   */
  async store(
    key: string,
    data: any,
    password: string,
    options: {
      ttl?: number;
      tags?: string[];
      compress?: boolean;
    } = {},
  ): Promise<boolean> {
    try {
      if (!isWebCryptoSupported()) {
        throw new Error("WebCrypto API not supported");
      }

      // Serialize data
      const serializedData = JSON.stringify(data);
      const dataBytes = new TextEncoder().encode(serializedData);

      // Compress data (if enabled)
      let processedData = dataBytes;
      const compress = options.compress ?? this.config.compression;
      if (compress && typeof window !== "undefined" && "CompressionStream" in window) {
        processedData = await this.compressData(dataBytes);
      }

      // Encrypt data
      const encryptedData = await encryptSecret(processedData, password);

      // Calculate checksum
      const checksum = await this.calculateChecksum(processedData);

      // Create metadata
      const now = Date.now();
      const ttl = options.ttl ?? this.config.entryTTL;
      const metadata: StorageEntryMetadata = {
        key,
        createdAt: now,
        lastAccessed: now,
        expiresAt: now + ttl,
        size: processedData.length,
        compressed: compress,
        tags: options.tags || [],
      };

      // Create storage entry
      const entry: EncryptedStorageEntry = {
        metadata,
        encryptedData,
        checksum,
      };

      // Check storage limits
      await this.enforceStorageLimits();

      // Store to backend
      const storageKey = this.config.keyPrefix + key;
      await this.backendAdapter.setItem(storageKey, entry);

      return true;
    } catch (error) {
      console.error("Failed to store encrypted data:", error);
      return false;
    }
  }

  /**
   * Retrieve and decrypt data
   */
  async retrieve(key: string, password: string): Promise<any | null> {
    try {
      if (!isWebCryptoSupported()) {
        throw new Error("WebCrypto API not supported");
      }

      const storageKey = this.config.keyPrefix + key;
      const entry = (await this.backendAdapter.getItem(storageKey)) as EncryptedStorageEntry | null;

      if (!entry) {
        return null;
      }

      // Check expiration
      if (Date.now() > entry.metadata.expiresAt) {
        await this.remove(key);
        return null;
      }

      // Decrypt data
      const decryptedData = await decryptSecret(entry.encryptedData, password);

      // Verify checksum
      const checksum = await this.calculateChecksum(decryptedData);
      if (checksum !== entry.checksum) {
        throw new Error("Data integrity check failed");
      }

      // Decompress data (if needed)
      let processedData = decryptedData;
      if (entry.metadata.compressed) {
        processedData = await this.decompressData(decryptedData);
      }

      // Deserialize data
      const serializedData = new TextDecoder().decode(processedData);
      const data = JSON.parse(serializedData);

      // Update last access time
      entry.metadata.lastAccessed = Date.now();
      await this.backendAdapter.setItem(storageKey, entry);

      return data;
    } catch (error) {
      console.error("Failed to retrieve encrypted data:", error);
      return null;
    }
  }

  /**
   * Remove storage entry
   */
  async remove(key: string): Promise<boolean> {
    try {
      const storageKey = this.config.keyPrefix + key;
      await this.backendAdapter.removeItem(storageKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List metadata of all storage entries
   */
  async listEntries(): Promise<StorageEntryMetadata[]> {
    try {
      const keys = await this.backendAdapter.getAllKeys();
      const entries: StorageEntryMetadata[] = [];

      for (const key of keys) {
        if (key.startsWith(this.config.keyPrefix)) {
          const entry = (await this.backendAdapter.getItem(key)) as EncryptedStorageEntry | null;
          if (entry) {
            entries.push(entry.metadata);
          }
        }
      }

      return entries.sort((a, b) => b.lastAccessed - a.lastAccessed);
    } catch {
      return [];
    }
  }

  /**
   * Clean up expired entries
   */
  async cleanup(): Promise<number> {
    try {
      const entries = await this.listEntries();
      const now = Date.now();
      let cleanedCount = 0;

      for (const entry of entries) {
        if (entry.expiresAt <= now) {
          await this.remove(entry.key);
          cleanedCount++;
        }
      }

      return cleanedCount;
    } catch {
      return 0;
    }
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<StorageStats> {
    try {
      const entries = await this.listEntries();

      if (entries.length === 0) {
        return {
          totalEntries: 0,
          totalSize: 0,
          expiredEntries: 0,
          compressionRatio: 0,
          oldestEntry: 0,
          newestEntry: 0,
        };
      }

      const now = Date.now();
      let totalSize = 0;
      let expiredEntries = 0;
      let compressedSize = 0;
      let uncompressedSize = 0;

      for (const entry of entries) {
        totalSize += entry.size;

        if (entry.expiresAt <= now) {
          expiredEntries++;
        }

        if (entry.compressed) {
          compressedSize += entry.size;
        } else {
          uncompressedSize += entry.size;
        }
      }

      const compressionRatio = compressedSize > 0 ? compressedSize / (compressedSize + uncompressedSize) : 0;

      return {
        totalEntries: entries.length,
        totalSize,
        expiredEntries,
        compressionRatio,
        oldestEntry: Math.min(...entries.map(e => e.createdAt)),
        newestEntry: Math.max(...entries.map(e => e.createdAt)),
      };
    } catch {
      return {
        totalEntries: 0,
        totalSize: 0,
        expiredEntries: 0,
        compressionRatio: 0,
        oldestEntry: 0,
        newestEntry: 0,
      };
    }
  }

  /**
   * Update entry TTL
   */
  async updateTTL(key: string, newTTL: number): Promise<boolean> {
    try {
      const storageKey = this.config.keyPrefix + key;
      const entry = (await this.backendAdapter.getItem(storageKey)) as EncryptedStorageEntry | null;

      if (!entry) {
        return false;
      }

      entry.metadata.expiresAt = Date.now() + newTTL;
      await this.backendAdapter.setItem(storageKey, entry);

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Backup all encrypted data
   */
  async backup(): Promise<string | null> {
    try {
      if (!this.config.enableBackup) {
        throw new Error("Backup is disabled");
      }

      const entries = await this.listEntries();
      const backupData = [];

      for (const metadata of entries) {
        const storageKey = this.config.keyPrefix + metadata.key;
        const entry = await this.backendAdapter.getItem(storageKey);
        backupData.push(entry);
      }

      return JSON.stringify({
        version: "1.0",
        timestamp: Date.now(),
        config: this.config,
        entries: backupData,
      });
    } catch (error) {
      console.error("Failed to create backup:", error);
      return null;
    }
  }

  // ========== Private Methods ==========

  /**
   * Create storage backend adapter
   */
  private createBackendAdapter(): StorageAdapter {
    // Force use localStorage on server side to avoid indexedDB errors
    if (typeof window === "undefined") {
      return new LocalStorageAdapter();
    }

    switch (this.config.backend) {
      case "localStorage":
        return new LocalStorageAdapter();
      case "sessionStorage":
        return new SessionStorageAdapter();
      case "indexedDB":
        // Check if indexedDB is available
        if ("indexedDB" in window) {
          return new IndexedDBAdapter();
        } else {
          console.warn("IndexedDB not available, falling back to localStorage");
          return new LocalStorageAdapter();
        }
      default:
        return new LocalStorageAdapter();
    }
  }

  /**
   * Enforce storage limits
   */
  private async enforceStorageLimits(): Promise<void> {
    const entries = await this.listEntries();

    if (entries.length >= this.config.maxEntries) {
      // Remove oldest entries
      const sortedEntries = entries.sort((a, b) => a.lastAccessed - b.lastAccessed);
      const toRemove = sortedEntries.slice(0, entries.length - this.config.maxEntries + 1);

      for (const entry of toRemove) {
        await this.remove(entry.key);
      }
    }
  }

  /**
   * Compress data
   */
  private async compressData(data: Uint8Array): Promise<Uint8Array> {
    if (typeof window === "undefined" || !("CompressionStream" in window)) {
      return data; // Return original data when compression not supported
    }

    try {
      const stream = new (window as any).CompressionStream("gzip");
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();

      writer.write(data);
      writer.close();

      const chunks: Uint8Array[] = [];
      let result = await reader.read();

      while (!result.done) {
        chunks.push(result.value);
        result = await reader.read();
      }

      // Merge all chunks
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const compressed = new Uint8Array(totalLength);
      let offset = 0;

      for (const chunk of chunks) {
        compressed.set(chunk, offset);
        offset += chunk.length;
      }

      return compressed;
    } catch {
      return data; // Return original data when compression fails
    }
  }

  /**
   * Decompress data
   */
  private async decompressData(data: Uint8Array): Promise<Uint8Array> {
    if (typeof window === "undefined" || !("DecompressionStream" in window)) {
      return data; // Return original data when decompression not supported
    }

    try {
      const stream = new (window as any).DecompressionStream("gzip");
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();

      writer.write(data);
      writer.close();

      const chunks: Uint8Array[] = [];
      let result = await reader.read();

      while (!result.done) {
        chunks.push(result.value);
        result = await reader.read();
      }

      // Merge all chunks
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const decompressed = new Uint8Array(totalLength);
      let offset = 0;

      for (const chunk of chunks) {
        decompressed.set(chunk, offset);
        offset += chunk.length;
      }

      return decompressed;
    } catch {
      return data; // Return original data when decompression fails
    }
  }

  /**
   * Calculate data checksum
   */
  private async calculateChecksum(data: Uint8Array): Promise<string> {
    const hashBuffer = await window.crypto.subtle.digest(CRYPTO_CONFIG.HASH_ALGORITHM, data);
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray)
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  }
}

// ========== Storage Adapter Interface ==========

/**
 * Storage adapter interface
 */
interface StorageAdapter {
  getItem(key: string): Promise<any>;
  setItem(key: string, value: any): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
}

/**
 * LocalStorage adapter
 */
class LocalStorageAdapter implements StorageAdapter {
  async getItem(key: string): Promise<any> {
    if (typeof window === "undefined") return null;

    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  }

  async setItem(key: string, value: any): Promise<void> {
    if (typeof window === "undefined") return;

    localStorage.setItem(key, JSON.stringify(value));
  }

  async removeItem(key: string): Promise<void> {
    if (typeof window === "undefined") return;

    localStorage.removeItem(key);
  }

  async getAllKeys(): Promise<string[]> {
    if (typeof window === "undefined") return [];

    return Object.keys(localStorage);
  }
}

/**
 * SessionStorage adapter
 */
class SessionStorageAdapter implements StorageAdapter {
  async getItem(key: string): Promise<any> {
    if (typeof window === "undefined") return null;

    const item = sessionStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  }

  async setItem(key: string, value: any): Promise<void> {
    if (typeof window === "undefined") return;

    sessionStorage.setItem(key, JSON.stringify(value));
  }

  async removeItem(key: string): Promise<void> {
    if (typeof window === "undefined") return;

    sessionStorage.removeItem(key);
  }

  async getAllKeys(): Promise<string[]> {
    if (typeof window === "undefined") return [];

    return Object.keys(sessionStorage);
  }
}

/**
 * IndexedDB adapter
 */
class IndexedDBAdapter implements StorageAdapter {
  private dbName = "SuiFusionEncryptedStorage";
  private storeName = "encrypted_data";
  private version = 1;

  private async getDB(): Promise<IDBDatabase> {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      throw new Error("IndexedDB not available");
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  async getItem(key: string): Promise<any> {
    if (typeof window === "undefined") return null;

    try {
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);

      return new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || null);
      });
    } catch {
      return null;
    }
  }

  async setItem(key: string, value: any): Promise<void> {
    if (typeof window === "undefined") return;

    const db = await this.getDB();
    const transaction = db.transaction([this.storeName], "readwrite");
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.put(value, key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async removeItem(key: string): Promise<void> {
    if (typeof window === "undefined") return;

    const db = await this.getDB();
    const transaction = db.transaction([this.storeName], "readwrite");
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getAllKeys(): Promise<string[]> {
    if (typeof window === "undefined") return [];

    try {
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);

      return new Promise((resolve, reject) => {
        const request = store.getAllKeys();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result as string[]);
      });
    } catch {
      return [];
    }
  }
}

/**
 * Default encrypted storage service instance
 */
// Lazy initialization to avoid server-side rendering issues
let _encryptedStorage: EncryptedStorageService | null = null;

export const encryptedStorage = {
  get instance(): EncryptedStorageService {
    if (!_encryptedStorage) {
      _encryptedStorage = new EncryptedStorageService();
    }
    return _encryptedStorage;
  },

  // Proxy all methods to instance
  async store(key: string, data: any, password: string, options: any = {}) {
    return this.instance.store(key, data, password, options);
  },

  async retrieve(key: string, password: string) {
    return this.instance.retrieve(key, password);
  },

  async remove(key: string) {
    return this.instance.remove(key);
  },

  async listEntries() {
    return this.instance.listEntries();
  },

  async cleanup() {
    return this.instance.cleanup();
  },

  async getStats() {
    return this.instance.getStats();
  },

  async updateTTL(key: string, newTTL: number) {
    return this.instance.updateTTL(key, newTTL);
  },

  async backup() {
    return this.instance.backup();
  },
};
