/**
 * Client secret manager
 * Handles secret generation, storage, retrieval and lifecycle management
 */
import {
  type EncryptedSecret,
  computeSecretHash,
  decryptSecret,
  encryptSecret,
  generateClientSecret,
  generateTimestampSignature,
  isWebCryptoSupported,
  secureClearArray,
  verifyTimestampSignature,
} from "./webCryptoUtils";

/**
 * Secret manager configuration
 */
export const SECRET_MANAGER_CONFIG = {
  // Storage configuration
  STORAGE_KEY_PREFIX: "sui_fusion_secret_",
  METADATA_KEY: "sui_fusion_metadata",

  // Secret lifecycle
  DEFAULT_SECRET_TTL: 24 * 60 * 60 * 1000, // 24 hours
  MAX_SECRET_AGE: 7 * 24 * 60 * 60 * 1000, // 7 days

  // Security configuration
  MAX_RETRY_ATTEMPTS: 3,
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes

  // Validation configuration
  MIN_PASSWORD_LENGTH: 8,
  REQUIRE_MIXED_CASE: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_SPECIAL_CHARS: false,
} as const;

/**
 * Secret metadata
 */
export interface SecretMetadata {
  keyId: string;
  alias: string;
  purpose: string;
  createdAt: number;
  lastUsed: number;
  expiresAt: number;
  usageCount: number;
  maxUsage?: number;
  tags: string[];
}

/**
 * Stored secret item
 */
export interface StoredSecretItem {
  metadata: SecretMetadata;
  encryptedSecret: EncryptedSecret;
  hash: string;
  signature: string;
}

/**
 * Active session information
 */
interface ActiveSession {
  keyId: string;
  secret: Uint8Array;
  hash: string;
  expiresAt: number;
  accessCount: number;
}

/**
 * Secret manager class
 */
export class SecretManager {
  private activeSessions: Map<string, ActiveSession> = new Map();
  private sessionCleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeManager();
  }

  /**
   * Initialize manager
   */
  private initializeManager(): void {
    if (!isWebCryptoSupported()) {
      console.warn("WebCrypto API not supported. Secret management will be limited.");
      return;
    }

    // Start session cleanup timer
    this.sessionCleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60000); // Clean up every minute

    // Clean up on page close
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => {
        this.destroy();
      });
    }
  }

  /**
   * Generate new client secret
   */
  async generateSecret(
    alias: string,
    purpose: string = "fusion_swap",
    options: {
      password?: string;
      ttl?: number;
      maxUsage?: number;
      tags?: string[];
    } = {},
  ): Promise<{
    keyId: string;
    hash: string;
    success: boolean;
    error?: string;
  }> {
    try {
      if (!isWebCryptoSupported()) {
        return { keyId: "", hash: "", success: false, error: "WebCrypto not supported" };
      }

      // Generate secret
      const secret = await generateClientSecret();

      // Compute hash
      const secretHash = await computeSecretHash(secret);

      // Generate timestamp signature
      const timestamp = Date.now();
      const signature = await generateTimestampSignature(secret, timestamp);

      // Prepare metadata
      const keyId = `secret_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
      const ttl = options.ttl || SECRET_MANAGER_CONFIG.DEFAULT_SECRET_TTL;

      const metadata: SecretMetadata = {
        keyId,
        alias,
        purpose,
        createdAt: timestamp,
        lastUsed: timestamp,
        expiresAt: timestamp + ttl,
        usageCount: 0,
        maxUsage: options.maxUsage,
        tags: options.tags || [],
      };

      // If password provided, encrypt and store
      if (options.password) {
        if (!this.validatePassword(options.password)) {
          secureClearArray(secret);
          return { keyId: "", hash: "", success: false, error: "Password does not meet requirements" };
        }

        const encryptedSecret = await encryptSecret(secret, options.password);

        const storedItem: StoredSecretItem = {
          metadata,
          encryptedSecret,
          hash: secretHash.hash,
          signature,
        };

        await this.storeSecretItem(keyId, storedItem);
      }

      // Create active session
      this.activeSessions.set(keyId, {
        keyId,
        secret: secret.slice(), // Create copy
        hash: secretHash.hash,
        expiresAt: Date.now() + SECRET_MANAGER_CONFIG.SESSION_TIMEOUT,
        accessCount: 0,
      });

      // Clear original secret
      secureClearArray(secret);

      return {
        keyId,
        hash: secretHash.hash,
        success: true,
      };
    } catch (error) {
      return {
        keyId: "",
        hash: "",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get secret (from session or storage)
   */
  async getSecret(
    keyId: string,
    password?: string,
  ): Promise<{
    secret?: Uint8Array;
    hash?: string;
    success: boolean;
    error?: string;
  }> {
    try {
      // First check active sessions
      const session = this.activeSessions.get(keyId);
      if (session) {
        if (Date.now() > session.expiresAt) {
          this.cleanupSession(keyId);
          return { success: false, error: "Session expired" };
        }

        session.accessCount++;
        session.expiresAt = Date.now() + SECRET_MANAGER_CONFIG.SESSION_TIMEOUT; // Extend session

        return {
          secret: session.secret.slice(), // Return copy
          hash: session.hash,
          success: true,
        };
      }

      // Restore from storage
      if (!password) {
        return { success: false, error: "Password required for stored secret" };
      }

      const storedItem = await this.getStoredSecretItem(keyId);
      if (!storedItem) {
        return { success: false, error: "Secret not found" };
      }

      // Check expiration time
      if (Date.now() > storedItem.metadata.expiresAt) {
        await this.removeStoredSecretItem(keyId);
        return { success: false, error: "Secret expired" };
      }

      // Decrypt secret
      const secret = await decryptSecret(storedItem.encryptedSecret, password);

      // Verify signature
      const isValidSignature = await verifyTimestampSignature(
        secret,
        storedItem.metadata.createdAt,
        storedItem.signature,
      );

      if (!isValidSignature) {
        secureClearArray(secret);
        return { success: false, error: "Secret signature validation failed" };
      }

      // Verify hash
      const secretHash = await computeSecretHash(secret);
      if (secretHash.hash !== storedItem.hash) {
        secureClearArray(secret);
        return { success: false, error: "Secret hash validation failed" };
      }

      // Update usage statistics
      storedItem.metadata.lastUsed = Date.now();
      storedItem.metadata.usageCount++;
      await this.updateStoredSecretItem(keyId, storedItem);

      // Create new active session
      this.activeSessions.set(keyId, {
        keyId,
        secret: secret.slice(),
        hash: secretHash.hash,
        expiresAt: Date.now() + SECRET_MANAGER_CONFIG.SESSION_TIMEOUT,
        accessCount: 1,
      });

      return {
        secret,
        hash: secretHash.hash,
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * List all stored secret metadata
   */
  async listSecrets(): Promise<SecretMetadata[]> {
    try {
      const metadata = await this.getStorageMetadata();
      const currentTime = Date.now();

      // Filter non-expired secrets
      return metadata.filter(meta => meta.expiresAt > currentTime);
    } catch {
      return [];
    }
  }

  /**
   * Remove secret
   */
  async removeSecret(keyId: string): Promise<boolean> {
    try {
      // Clean up active session
      this.cleanupSession(keyId);

      // Remove from storage
      await this.removeStoredSecretItem(keyId);

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Update secret metadata
   */
  async updateSecretMetadata(
    keyId: string,
    updates: Partial<Omit<SecretMetadata, "keyId" | "createdAt">>,
  ): Promise<boolean> {
    try {
      const storedItem = await this.getStoredSecretItem(keyId);
      if (!storedItem) return false;

      // Apply updates
      Object.assign(storedItem.metadata, updates);

      await this.updateStoredSecretItem(keyId, storedItem);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clean up expired secrets and sessions
   */
  async cleanup(): Promise<void> {
    // Clean up expired sessions
    this.cleanupExpiredSessions();

    // Clean up expired stored secrets
    try {
      const metadata = await this.getStorageMetadata();
      const currentTime = Date.now();

      for (const meta of metadata) {
        if (meta.expiresAt <= currentTime) {
          await this.removeStoredSecretItem(meta.keyId);
        }
      }
    } catch (error) {
      console.error("Failed to cleanup expired secrets:", error);
    }
  }

  /**
   * Destroy manager
   */
  destroy(): void {
    // Clean up all active sessions
    for (const [keyId] of this.activeSessions) {
      this.cleanupSession(keyId);
    }
    this.activeSessions.clear();

    // Clean up timer
    if (this.sessionCleanupInterval) {
      clearInterval(this.sessionCleanupInterval);
      this.sessionCleanupInterval = null;
    }
  }

  // ========== Private Methods ==========

  /**
   * Validate password strength
   */
  private validatePassword(password: string): boolean {
    if (password.length < SECRET_MANAGER_CONFIG.MIN_PASSWORD_LENGTH) {
      return false;
    }

    if (SECRET_MANAGER_CONFIG.REQUIRE_MIXED_CASE) {
      if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
        return false;
      }
    }

    if (SECRET_MANAGER_CONFIG.REQUIRE_NUMBERS) {
      if (!/\d/.test(password)) {
        return false;
      }
    }

    if (SECRET_MANAGER_CONFIG.REQUIRE_SPECIAL_CHARS) {
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Clean up single session
   */
  private cleanupSession(keyId: string): void {
    const session = this.activeSessions.get(keyId);
    if (session) {
      secureClearArray(session.secret);
      this.activeSessions.delete(keyId);
    }
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const currentTime = Date.now();
    for (const [keyId, session] of this.activeSessions) {
      if (session.expiresAt <= currentTime) {
        this.cleanupSession(keyId);
      }
    }
  }

  /**
   * Store secret item to local storage
   */
  private async storeSecretItem(keyId: string, item: StoredSecretItem): Promise<void> {
    if (typeof window === "undefined") return;

    const storageKey = SECRET_MANAGER_CONFIG.STORAGE_KEY_PREFIX + keyId;
    localStorage.setItem(storageKey, JSON.stringify(item));

    // Update metadata index
    await this.updateStorageMetadata(item.metadata);
  }

  /**
   * Get secret item from local storage
   */
  private async getStoredSecretItem(keyId: string): Promise<StoredSecretItem | null> {
    if (typeof window === "undefined") return null;

    const storageKey = SECRET_MANAGER_CONFIG.STORAGE_KEY_PREFIX + keyId;
    const stored = localStorage.getItem(storageKey);

    if (!stored) return null;

    try {
      return JSON.parse(stored) as StoredSecretItem;
    } catch {
      return null;
    }
  }

  /**
   * Update stored secret item
   */
  private async updateStoredSecretItem(keyId: string, item: StoredSecretItem): Promise<void> {
    await this.storeSecretItem(keyId, item);
  }

  /**
   * Remove secret item from local storage
   */
  private async removeStoredSecretItem(keyId: string): Promise<void> {
    if (typeof window === "undefined") return;

    const storageKey = SECRET_MANAGER_CONFIG.STORAGE_KEY_PREFIX + keyId;
    localStorage.removeItem(storageKey);

    // Remove from metadata index
    await this.removeFromStorageMetadata(keyId);
  }

  /**
   * Get storage metadata
   */
  private async getStorageMetadata(): Promise<SecretMetadata[]> {
    if (typeof window === "undefined") return [];

    const stored = localStorage.getItem(SECRET_MANAGER_CONFIG.METADATA_KEY);
    if (!stored) return [];

    try {
      return JSON.parse(stored) as SecretMetadata[];
    } catch {
      return [];
    }
  }

  /**
   * Update storage metadata
   */
  private async updateStorageMetadata(metadata: SecretMetadata): Promise<void> {
    if (typeof window === "undefined") return;

    const allMetadata = await this.getStorageMetadata();
    const index = allMetadata.findIndex(m => m.keyId === metadata.keyId);

    if (index >= 0) {
      allMetadata[index] = metadata;
    } else {
      allMetadata.push(metadata);
    }

    localStorage.setItem(SECRET_MANAGER_CONFIG.METADATA_KEY, JSON.stringify(allMetadata));
  }

  /**
   * Remove from storage metadata
   */
  private async removeFromStorageMetadata(keyId: string): Promise<void> {
    if (typeof window === "undefined") return;

    const allMetadata = await this.getStorageMetadata();
    const filtered = allMetadata.filter(m => m.keyId !== keyId);

    localStorage.setItem(SECRET_MANAGER_CONFIG.METADATA_KEY, JSON.stringify(filtered));
  }
}

/**
 * Global secret manager instance
 */
export const secretManager = new SecretManager();
