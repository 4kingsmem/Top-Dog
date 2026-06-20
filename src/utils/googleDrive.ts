/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Detect if we are using the default/unconfigured placeholder key
const isPlaceholderKey = !firebaseConfig.apiKey || firebaseConfig.apiKey.includes('remixed-api-key');

let app: any;
export let auth: any;

if (!isPlaceholderKey) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  } catch (error) {
    console.warn('Firebase initialization failed. Falling back to local simulation mode:', error);
  }
}

const provider = new GoogleAuthProvider();
// Request the Google Drive & profile scopes
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive.readonly');
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
provider.addScope('https://www.googleapis.com/auth/userinfo.email');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (isPlaceholderKey || !auth) {
    // Local simulation mode active
    console.log('Top Dog running in unconfigured sandbox simulation mode.');
    const savedUserJson = sessionStorage.getItem('topdog_mock_user');
    const savedToken = sessionStorage.getItem('topdog_drive_token');
    
    setTimeout(() => {
      if (savedUserJson && savedToken) {
        try {
          const userObj = JSON.parse(savedUserJson);
          cachedAccessToken = savedToken;
          if (onAuthSuccess) onAuthSuccess(userObj as User, savedToken);
        } catch {
          if (onAuthFailure) onAuthFailure();
        }
      } else {
        if (onAuthFailure) onAuthFailure();
      }
    }, 100);
    
    return () => {};
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Try to fetch from sessionStorage as fallback cache
        const savedToken = sessionStorage.getItem('topdog_drive_token');
        if (savedToken) {
          cachedAccessToken = savedToken;
          if (onAuthSuccess) onAuthSuccess(user, savedToken);
        } else {
          cachedAccessToken = null;
          if (onAuthFailure) onAuthFailure();
        }
      }
    } else {
      cachedAccessToken = null;
      sessionStorage.removeItem('topdog_drive_token');
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Google Sign-In with popup
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (isPlaceholderKey || !auth) {
    // Proactively mock Google sign-in to prevent any 400 bad API key network errors
    console.log('Simulating Google Sign-in to protect unconfigured developers...');
    isSigningIn = true;
    
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockUser = {
          uid: 'mock-sandbox-user-123',
          displayName: 'Rider Champion',
          email: 'thee4kingsmen@gmail.com',
          photoURL: null,
          emailVerified: true,
          isAnonymous: false,
        };
        
        cachedAccessToken = 'mock-google-drive-access-token-987';
        sessionStorage.setItem('topdog_mock_user', JSON.stringify(mockUser));
        sessionStorage.setItem('topdog_drive_token', cachedAccessToken);
        isSigningIn = false;
        resolve({ user: mockUser as any, accessToken: cachedAccessToken });
      }, 500);
    });
  }

  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Drive access token from authentication.');
    }

    cachedAccessToken = credential.accessToken;
    sessionStorage.setItem('topdog_drive_token', cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Auth Popup Error: ', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Logout from active session
export const logoutFromGoogle = async () => {
  sessionStorage.removeItem('topdog_mock_user');
  sessionStorage.removeItem('topdog_drive_token');
  cachedAccessToken = null;
  
  if (isPlaceholderKey || !auth) {
    return;
  }
  
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
  }
};

export const getCachedToken = (): string | null => {
  return cachedAccessToken || sessionStorage.getItem('topdog_drive_token');
};

/**
 * GOOGLE DRIVE API UTILITIES
 */

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  size?: string;
}

// Search and list compatible audio and asset files in their Google Drive
export const listDriveFiles = async (token: string): Promise<DriveFile[]> => {
  if (isPlaceholderKey || token.startsWith('mock')) {
    // Return high quality simulation drive files for seamless previewing
    return [
      {
        id: 'mock_sound_1',
        name: 'synthwave_arcade_loop.mp3',
        mimeType: 'audio/mpeg',
        size: '4203112'
      },
      {
        id: 'mock_sound_2',
        name: 'cyberpunk_dogs_theme.wav',
        mimeType: 'audio/wav',
        size: '12401931'
      },
      {
        id: 'mock_skin_1',
        name: 'quantum_golden_glow_skin.glb',
        mimeType: 'application/octet-stream',
        size: '8592182'
      },
      {
        id: 'mock_backup_1',
        name: 'topdog_stats_backup.json',
        mimeType: 'application/json',
        size: '1410'
      }
    ];
  }

  try {
    // Search for mp3, wav, glb, gltf, json, or text files
    const query = "mimeType = 'audio/mpeg' or mimeType = 'audio/wav' or name contains '.mp3' or name contains '.wav' or name contains '.glb' or name contains '.gltf' or name = 'topdog_stats_backup.json' or name contains 'topdog_custom'";
    
    // Call v3 Google Drive List with Shared Drives support
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        "trashed = false and (" + query + ")"
      )}&fields=files(id,name,mimeType,size)&pageSize=40&supportsAllDrives=true&includeItemsFromAllDrives=true`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      const errTxt = await response.text();
      throw new Error(`Drive list failed: ${response.status} - ${errTxt}`);
    }

    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error('Error listing Google Drive files:', error);
    return [];
  }
};

// Backup game progress to Google Drive as a JSON file
export const backupStatsToDrive = async (token: string, statsData: any): Promise<boolean> => {
  if (isPlaceholderKey || token.startsWith('mock')) {
    console.log('Mock Stats Backup Completed:', statsData);
    localStorage.setItem('topdog_drive_mock_backup', JSON.stringify({
      backupDate: new Date().toISOString(),
      gameName: "Top Dog Agility Arena",
      ...statsData
    }, null, 2));
    return new Promise((resolve) => setTimeout(() => resolve(true), 800));
  }

  try {
    // 1. Search if 'topdog_stats_backup.json' already exists
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        "name = 'topdog_stats_backup.json' and trashed = false"
      )}&fields=files(id)`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    let fileId: string | null = null;
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        fileId = searchData.files[0].id;
      }
    }

    const fileContent = JSON.stringify({
      backupDate: new Date().toISOString(),
      gameName: "Top Dog Agility Arena",
      ...statsData
    }, null, 2);

    if (fileId) {
      // 2. File exists: update content using PUT
      const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
      const updateRes = await fetch(uploadUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: fileContent
      });
      return updateRes.ok;
    } else {
      // 3. File doesn't exist: create file with metadata using multiparts or two-step
      const metadataUrl = 'https://www.googleapis.com/drive/v3/files';
      const metaRes = await fetch(metadataUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'topdog_stats_backup.json',
          mimeType: 'application/json',
          description: 'Top Dog Arcade Game character and trophy backups.'
        })
      });

      if (!metaRes.ok) return false;
      const metaData = await metaRes.json();
      const newFileId = metaData.id;

      // Update content
      const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${newFileId}?uploadType=media`;
      const finalRes = await fetch(uploadUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: fileContent
      });
      return finalRes.ok;
    }
  } catch (error) {
    console.error('Error backing up stats to Google Drive:', error);
    return false;
  }
};

// Restore stats from a backups file found in Google Drive
export const restoreStatsFromDrive = async (token: string): Promise<any | null> => {
  if (isPlaceholderKey || token.startsWith('mock')) {
    const rawMock = localStorage.getItem('topdog_drive_mock_backup');
    if (!rawMock) return null;
    return new Promise((resolve) => setTimeout(() => resolve(JSON.parse(rawMock)), 800));
  }

  try {
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        "name = 'topdog_stats_backup.json' and trashed = false"
      )}&fields=files(id)`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    if (!searchData.files || searchData.files.length === 0) {
      return null;
    }

    const fileId = searchData.files[0].id;
    // Fetch file content
    const contentRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!contentRes.ok) return null;
    return await contentRes.json();
  } catch (error) {
    console.error('Error restoring stats from Drive:', error);
    return null;
  }
};

// Fetch raw array buffer of a file (for custom audio decode or GLTF load)
export const fetchDriveFileArrayBuffer = async (token: string, fileId: string): Promise<ArrayBuffer | null> => {
  if (isPlaceholderKey || token.startsWith('mock')) {
    // Return mock buffer
    return new Promise((resolve) => setTimeout(() => resolve(new ArrayBuffer(100)), 500));
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!response.ok) return null;
    return await response.arrayBuffer();
  } catch (error) {
    console.error('Error downloading Drive file buffer:', error);
    return null;
  }
};

// Create a demo text or music file in Drive to let user check how it works
export const createDemoFilesOnDrive = async (token: string): Promise<boolean> => {
  if (isPlaceholderKey || token.startsWith('mock')) {
    return new Promise((resolve) => setTimeout(() => resolve(true), 600));
  }

  try {
    const musicMetaRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'topdog_custom_demo_tune.mp3',
        mimeType: 'audio/mpeg',
        description: 'Demo music file created by Top Dog App'
      })
    });

    if (!musicMetaRes.ok) return false;
    
    // Create custom texture config file
    const textureMetaRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'topdog_custom_dog_gltf.glb',
        mimeType: 'application/octet-stream',
        description: 'Custom dog cybernetic glb layout.'
      })
    });

    return textureMetaRes.ok;
  } catch (error) {
    console.error('Error creating demo files:', error);
    return false;
  }
};
