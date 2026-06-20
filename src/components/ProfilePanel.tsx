/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  User as FirebaseUser
} from 'firebase/auth';
import {
  googleSignIn,
  logoutFromGoogle,
  initAuth,
  listDriveFiles,
  backupStatsToDrive,
  restoreStatsFromDrive,
  fetchDriveFileArrayBuffer,
  createDemoFilesOnDrive,
  DriveFile
} from '../utils/googleDrive';
import { GameAudio } from '../utils/audio';
import { DogCharacter, GameAchievement } from '../types';
import {
  User,
  LogOut,
  FolderOpen,
  CloudLightning,
  RefreshCw,
  Sparkles,
  Trophy,
  Bone,
  Award,
  Music,
  Disc,
  Play,
  Pause,
  AlertTriangle,
  Settings,
  ShieldCheck,
  CheckCircle2,
  FileCode,
  ChevronLeft,
  X,
  MessageSquare,
  UserPlus,
  UserMinus,
  Users,
  Send,
  Heart,
  Smile
} from 'lucide-react';

interface FriendProfile {
  id: string;
  name: string;
  email: string;
  level: number;
  breed: string;
  avatarLetter: string;
  avatarColor: string;
  bones: number;
  tokens: number;
  bestDistance: number;
  followersCount: number;
  followingCount: number;
  isFriend: boolean;
  specialPerk: string;
  customStats: {
    highestRun: number;
    mostCoinsCollected: number;
    gamesWon: number;
    recordRuns: number;
    perfectCourses: number;
    bonesSpent: number;
    averageSpeed: number; // m/s
    totalPlayTime: string;
  };
  friendIds: string[]; // references to other profiles
}

const MOCK_PROFILES: Record<string, FriendProfile> = {
  "Agility_Max": {
    id: "Agility_Max",
    name: "AgilityAce Max",
    email: "max.boxer@topdog.net",
    level: 24,
    breed: "Boxer",
    avatarLetter: "M",
    avatarColor: "bg-orange-600 shadow-[0_0_15px_rgba(249,115,22,0.4)]",
    bones: 320,
    tokens: 14,
    bestDistance: 450,
    followersCount: 148,
    followingCount: 92,
    isFriend: true,
    specialPerk: "+15% Higher Double Jump Heights",
    customStats: {
      highestRun: 450,
      mostCoinsCollected: 184,
      gamesWon: 34,
      recordRuns: 6,
      perfectCourses: 12,
      bonesSpent: 850,
      averageSpeed: 12.4,
      totalPlayTime: "24.5 Hours",
    },
    friendIds: ["Bella_Shiba", "Biscuit_Bandit", "Shadow_Husky"]
  },
  "Bella_Shiba": {
    id: "Bella_Shiba",
    name: "Speedy Bella",
    email: "bella.shiba@howl.org",
    level: 19,
    breed: "Shiba Inu",
    avatarLetter: "B",
    avatarColor: "bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]",
    bones: 210,
    tokens: 8,
    bestDistance: 380,
    followersCount: 220,
    followingCount: 180,
    isFriend: true,
    specialPerk: "Auto-pull Bones from 1.5m away",
    customStats: {
      highestRun: 380,
      mostCoinsCollected: 142,
      gamesWon: 21,
      recordRuns: 3,
      perfectCourses: 7,
      bonesSpent: 420,
      averageSpeed: 10.9,
      totalPlayTime: "16.2 Hours",
    },
    friendIds: ["Agility_Max", "Golden_Racer", "Howl_Star"]
  },
  "Biscuit_Bandit": {
    id: "Biscuit_Bandit",
    name: "Biscuit Bandit",
    email: "bandit.beagle@doggo.com",
    level: 31,
    breed: "Beagle",
    avatarLetter: "D",
    avatarColor: "bg-purple-600 shadow-[0_0_15px_rgba(147,51,234,0.4)]",
    bones: 550,
    tokens: 28,
    bestDistance: 620,
    followersCount: 340,
    followingCount: 290,
    isFriend: false,
    specialPerk: "Sand excavation yields Double loot",
    customStats: {
      highestRun: 620,
      mostCoinsCollected: 295,
      gamesWon: 58,
      recordRuns: 11,
      perfectCourses: 23,
      bonesSpent: 1450,
      averageSpeed: 11.5,
      totalPlayTime: "42.0 Hours",
    },
    friendIds: ["Agility_Max", "Shadow_Husky", "Bark_Vader"]
  },
  "Golden_Racer": {
    id: "Golden_Racer",
    name: "Golden Racer",
    email: "racer.golden@retriever.io",
    level: 15,
    breed: "Golden Retriever",
    avatarLetter: "G",
    avatarColor: "bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)]",
    bones: 140,
    tokens: 5,
    bestDistance: 290,
    followersCount: 89,
    followingCount: 64,
    isFriend: false,
    specialPerk: "Permanent +10% Training XP Multiplier",
    customStats: {
      highestRun: 290,
      mostCoinsCollected: 98,
      gamesWon: 12,
      recordRuns: 1,
      perfectCourses: 3,
      bonesSpent: 280,
      averageSpeed: 9.8,
      totalPlayTime: "8.5 Hours",
    },
    friendIds: ["Bella_Shiba", "Howl_Star", "Puppy_Nugget"]
  },
  "Shadow_Husky": {
    id: "Shadow_Husky",
    name: "Shadow Husky",
    email: "shadow.husky@phantom.net",
    level: 42,
    breed: "Husky",
    avatarLetter: "S",
    avatarColor: "bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]",
    bones: 980,
    tokens: 64,
    bestDistance: 950,
    followersCount: 612,
    followingCount: 410,
    isFriend: true,
    specialPerk: "Unshakable speed boost on flawless slides",
    customStats: {
      highestRun: 950,
      mostCoinsCollected: 468,
      gamesWon: 91,
      recordRuns: 24,
      perfectCourses: 45,
      bonesSpent: 3480,
      averageSpeed: 14.8,
      totalPlayTime: "74.1 Hours",
    },
    friendIds: ["Agility_Max", "Biscuit_Bandit", "Bark_Vader", "Howl_Star"]
  },
  "Bark_Vader": {
    id: "Bark_Vader",
    name: "Bark Vader",
    email: "vader.rott@galaxy.org",
    level: 28,
    breed: "Rottweiler",
    avatarLetter: "V",
    avatarColor: "bg-red-700 shadow-[0_0_15px_rgba(220,38,38,0.4)]",
    bones: 410,
    tokens: 19,
    bestDistance: 510,
    followersCount: 195,
    followingCount: 110,
    isFriend: false,
    specialPerk: "Breaks hurdles instead of resetting multi",
    customStats: {
      highestRun: 510,
      mostCoinsCollected: 215,
      gamesWon: 41,
      recordRuns: 8,
      perfectCourses: 15,
      bonesSpent: 980,
      averageSpeed: 13.1,
      totalPlayTime: "31.4 Hours",
    },
    friendIds: ["Biscuit_Bandit", "Shadow_Husky", "Howl_Star"]
  },
  "Howl_Star": {
    id: "Howl_Star",
    name: "Howl Star",
    email: "howlstar@corgi.tv",
    level: 22,
    breed: "Corgi",
    avatarLetter: "H",
    avatarColor: "bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.4)]",
    bones: 290,
    tokens: 12,
    bestDistance: 410,
    followersCount: 177,
    followingCount: 154,
    isFriend: true,
    specialPerk: "+2 seconds Magnet and Shield duration",
    customStats: {
      highestRun: 410,
      mostCoinsCollected: 165,
      gamesWon: 29,
      recordRuns: 5,
      perfectCourses: 10,
      bonesSpent: 620,
      averageSpeed: 11.1,
      totalPlayTime: "21.6 Hours",
    },
    friendIds: ["Bella_Shiba", "Golden_Racer", "Shadow_Husky", "Bark_Vader"]
  },
  "Puppy_Nugget": {
    id: "Puppy_Nugget",
    name: "Puppy Nugget",
    email: "nugget.poodle@fluff.com",
    level: 8,
    breed: "Poodle",
    avatarLetter: "N",
    avatarColor: "bg-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.3)]",
    bones: 60,
    tokens: 2,
    bestDistance: 130,
    followersCount: 45,
    followingCount: 41,
    isFriend: false,
    specialPerk: "+12% Chance of spawning a Double Bone reward",
    customStats: {
      highestRun: 130,
      mostCoinsCollected: 45,
      gamesWon: 2,
      recordRuns: 0,
      perfectCourses: 1,
      bonesSpent: 120,
      averageSpeed: 8.5,
      totalPlayTime: "3.2 Hours",
    },
    friendIds: ["Golden_Racer"]
  }
};

const DOG_PERSONALITY_RESPONSES: Record<string, string[]> = {
  "Agility_Max": [
    "Woof! Did someone say double-jumping? I'm already in midair! Let me know when you want to race side-by-side! 🐕💨",
    "Tail wags! Keep practice sliding and ducking, Max has your back! Always push for that new record!",
    "Bones collected today are bones spent in the kennel tomorrow! Adopting new friends is the breed standard."
  ],
  "Bella_Shiba": [
    "Much Speed! Very jump! My magnetic pull grabs items from miles away. Try beating my trial score! 🐕💖",
    "Wholf! I love the scent of fresh mud tracks in the morning. Let's do a friendly Solo trial!",
    "If you want to adopt more runners, save up those bones! See you soon on the leagues board."
  ],
  "Biscuit_Bandit": [
    "Sniff sniff... I smell custom sandbox treasures! Hold 'E' to dig with me, we will secure double bones!",
    "Arrf! A good runner never misses a sandpile. Have you visited the shop to claim rewards today?",
    "Keep pushing that endless record distance! Best of luck on the high-priority leagues."
  ],
  "Golden_Racer": [
    "Tail wags at maximum velocity! My gold training multiplier unlocks huge evolutions fast! Let's chase that target! 🏆",
    "Woof! Every bisuit counts. Let's team up for an Agility run!",
    "Did you complete your daily biscuits bonus? Always collect your daily loot!"
  ],
  "Shadow_Husky": [
    "Aroooo! The ice and sand won't slow us down. I create beautiful spectral trails when I sprint!",
    "Greetings competitor! Stay hydrated, keep sliding, and never trip on low barricades.",
    "A master husky always runs the extra mile. Can you conquer the 5-lane extreme challenge?"
  ],
  "Bark_Vader": [
    "Harrumph! Don't let those obstacles intimidate you. I simply smash barriers block on impact! 🪓🐕",
    "Show me your best speed metrics. If we stay focused, we'll conquer all leagues together.",
    "Bones are valuable, but friendship is the ultimate reward. Let's conquer the leaderboard!"
  ],
  "Howl_Star": [
    "Yap yap! Shield duration is key to survival. Keep your shield charged and those high-combos active!",
    "Welcome to my training hub! Let's optimize our routes to collect every single biscuit.",
    "Ready to try our live Ghost phantom race? It is an outstanding workout!"
  ],
  "Puppy_Nugget": [
    "Yip! I'm small but incredibly lucky! Let's discover some double-bone spawn multipliers! 🍀🐶",
    "I love running through hurdles. Keep training hard to level up!",
    "Adopt more companion athletes to form the ultimate pack!"
  ]
};

interface ProfilePanelProps {
  userBones: number;
  userTokens: number;
  bestDistance: number;
  characters: DogCharacter[];
  achievements: GameAchievement[];
  activeBreed: string;
  onSelectCharacter: (breed: any) => void;
  onMusicLoaded: (buffer: ArrayBuffer | null, filename: string) => void;
  activeMusicName: string;
  customDogSkin: string;
  onSetCustomSkin: (skinName: string) => void;
  onSetCustomModelBuffer?: (buffer: ArrayBuffer | null) => void;
  onStatsRestored: (data: {
    bones: number;
    tokens: number;
    bestDistance: number;
    characters: DogCharacter[];
    achievements: GameAchievement[];
  }) => void;
  onClose: () => void;
}

export const ProfilePanel: React.FC<ProfilePanelProps> = ({
  userBones,
  userTokens,
  bestDistance,
  characters,
  achievements,
  activeBreed,
  onSelectCharacter,
  onMusicLoaded,
  activeMusicName,
  customDogSkin,
  onSetCustomSkin,
  onSetCustomModelBuffer,
  onStatsRestored,
  onClose
}) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [isRestoreLoading, setIsRestoreLoading] = useState(false);
  const [isMusicDownloading, setIsMusicDownloading] = useState<string | null>(null);
  const [backupStatusMessage, setBackupStatusMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'drive_files'>('profile');

  // Interactive followers & friends list states
  const [profileHistory, setProfileHistory] = useState<string[]>(['me']);
  const [friendStatusMap, setFriendStatusMap] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    Object.keys(MOCK_PROFILES).forEach((key) => {
      initial[key] = MOCK_PROFILES[key].isFriend;
    });
    return initial;
  });

  const [communityTab, setCommunityTab] = useState<'followers' | 'following'>('followers');
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);

  // Chat/Messaging system state
  const [chatTargetId, setChatTargetId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatHistoryMap, setChatHistoryMap] = useState<Record<string, Array<{ sender: 'user' | 'dog'; text: string; time: string }>>>({});
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Trigger auth state evaluation on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setAccessToken(token);
        setIsLoadingAuth(false);
        loadDriveContent(token);
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
        setIsLoadingAuth(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Scroll to bottom of chat automatically when messages arrive
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistoryMap, chatTargetId]);

  const handleLogin = async () => {
    try {
      setIsLoadingAuth(true);
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setAccessToken(res.accessToken);
        GameAudio.playCollect && GameAudio.playCollect(true, false);
        loadDriveContent(res.accessToken);
      }
    } catch (err) {
      console.error('Google Sign-in popup failed:', err);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleLogout = async () => {
    // Standard dialog helper
    const conf = window.confirm('Are you certain you wish to sign out of Google Drive?');
    if (!conf) return;
    try {
      setIsLoadingAuth(true);
      await logoutFromGoogle();
      setCurrentUser(null);
      setAccessToken(null);
      setDriveFiles([]);
      onMusicLoaded(null, '');
    } catch (err) {
      console.error('Google logout error:', err);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const loadDriveContent = async (token: string) => {
    if (!token) return;
    const files = await listDriveFiles(token);
    setDriveFiles(files || []);
  };

  const handleBackup = async () => {
    if (!accessToken) return;
    setIsBackupLoading(true);
    setBackupStatusMessage(null);
    try {
      const success = await backupStatsToDrive(accessToken, {
        bones: userBones,
        tokens: userTokens,
        bestDistance: bestDistance,
        characters: characters,
        achievements: achievements,
        activeBreed: activeBreed
      });

      if (success) {
        setBackupStatusMessage('Successfully backed up all progress to Google Drive as topdog_stats_backup.json!');
        GameAudio.playLevelUp();
      } else {
        setBackupStatusMessage('Backup failed. Check network permissions or retry.');
      }
    } catch (e) {
      console.error(e);
      setBackupStatusMessage('Backup encountered a network or permission error.');
    } finally {
      setIsBackupLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!accessToken) return;
    const confirmRestore = window.confirm(
      'Are you sure you want to restore stats from Google Drive? This will overwrite your current local score and character levels.'
    );
    if (!confirmRestore) return;

    setIsRestoreLoading(true);
    setBackupStatusMessage(null);
    try {
      const restored = await restoreStatsFromDrive(accessToken);
      if (restored) {
        onStatsRestored({
          bones: restored.bones ?? 100,
          tokens: restored.tokens ?? 2,
          bestDistance: restored.bestDistance ?? 0,
          characters: restored.characters ?? characters,
          achievements: restored.achievements ?? achievements
        });
        setBackupStatusMessage('Game stats successfully restored from Google Drive file backup!');
        GameAudio.playLevelUp();
      } else {
        setBackupStatusMessage('No previous backup (topdog_stats_backup.json) was found in your Drive tab.');
      }
    } catch (e) {
      console.error(e);
      setBackupStatusMessage('Restore met a network configuration error.');
    } finally {
      setIsRestoreLoading(false);
    }
  };

  const handleSelectDriveMusic = async (file: DriveFile) => {
    if (!accessToken) return;
    setIsMusicDownloading(file.name);
    try {
      const buffer = await fetchDriveFileArrayBuffer(accessToken, file.id);
      if (buffer) {
        onMusicLoaded(buffer, file.name);
        GameAudio.playCollect && GameAudio.playCollect(true, true);
        alert(`Successfully downloaded and loaded "${file.name}" as custom background game music!`);
      } else {
        alert('Failed to read file contents from Drive.');
      }
    } catch (error) {
      console.error(error);
      alert('Downloaded met a fetch error.');
    } finally {
      setIsMusicDownloading(null);
    }
  };

  const handleLoadCustomSkin = async (file: DriveFile) => {
    onSetCustomSkin(file.name);
    localStorage.setItem('topdog_custom_skin_file_id', file.id);
    localStorage.setItem('topdog_custom_skin_name', file.name);
    GameAudio.playPowerup();

    if (accessToken) {
      try {
        const buffer = await fetchDriveFileArrayBuffer(accessToken, file.id);
        if (buffer && onSetCustomModelBuffer) {
          onSetCustomModelBuffer(buffer);
          alert(`Equipped and loaded custom 3D model "${file.name}"! Ready to use!`);
        } else {
          alert(`Selected model "${file.name}". NOTE: File content stream failed, procedurals will be used.`);
        }
      } catch (err) {
        console.error('Failed to parse 3D model buffer on load:', err);
        alert(`Equipped "${file.name}"!`);
      }
    } else {
      alert(`Equipped custom skin "${file.name}".`);
    }
  };

  const handleCreateDemoFiles = async () => {
    if (!accessToken) return;
    const success = await createDemoFilesOnDrive(accessToken);
    if (success) {
      alert('Created demo files topdog_custom_demo_tune.mp3 and topdog_custom_dog_gltf.glb in your Google Drive!');
      loadDriveContent(accessToken);
    } else {
      alert('Failed to create demo assets.');
    }
  };

  // Stack routing controllers
  const currentProfileId = profileHistory[profileHistory.length - 1];
  const isViewingMe = currentProfileId === 'me';
  const activeFriend = !isViewingMe ? MOCK_PROFILES[currentProfileId] : null;

  const handleVisitProfile = (id: string) => {
    setProfileHistory((prev) => [...prev, id]);
    setActionMenuOpenId(null);
    GameAudio.playCollect && GameAudio.playCollect(false, false);
  };

  const handlePopProfile = () => {
    if (profileHistory.length > 1) {
      setProfileHistory((prev) => prev.slice(0, -1));
      GameAudio.playCollect && GameAudio.playCollect(false, false);
    }
  };

  const handleToggleFriend = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFriendStatusMap((prev) => {
      const isCurrentlyFriend = prev[id];
      const updated = { ...prev, [id]: !isCurrentlyFriend };
      
      // Update local count feedback dynamically
      if (MOCK_PROFILES[id]) {
        MOCK_PROFILES[id].isFriend = !isCurrentlyFriend;
        if (!isCurrentlyFriend) {
          MOCK_PROFILES[id].followersCount += 1;
        } else {
          MOCK_PROFILES[id].followersCount = Math.max(0, MOCK_PROFILES[id].followersCount - 1);
        }
      }
      return updated;
    });
    GameAudio.playCollect && GameAudio.playCollect(true, false);
  };

  const handleSendMessage = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setChatTargetId(id);
    setActionMenuOpenId(null);
    
    // Initialize chat history if empty
    if (!chatHistoryMap[id]) {
      const firstGreetings = [
        "Hey look! It's our favorite runner. Ready to share tactics? 🐾",
        "Wufff! Ready to slide on some trails?",
        "Hey! What's your personal best distance today?"
      ];
      const randomGreet = firstGreetings[Math.floor(Math.random() * firstGreetings.length)];
      setChatHistoryMap(prev => ({
        ...prev,
        [id]: [
          { sender: 'dog', text: randomGreet, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
        ]
      }));
    }
    GameAudio.playCollect && GameAudio.playCollect(false, false);
  };

  const submitChatMessage = () => {
    if (!chatInput.trim() || !chatTargetId) return;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { sender: 'user' as const, text: chatInput, time: timeStr };
    
    const target = chatTargetId;
    setChatHistoryMap(prev => ({
      ...prev,
      [target]: [...(prev[target] || []), userMsg]
    }));
    setChatInput('');
    GameAudio.playCollect && GameAudio.playCollect(true, false);

    // Simulate real custom dog personality response after 1 second
    setTimeout(() => {
      const responses = DOG_PERSONALITY_RESPONSES[target] || [
        "Woof! That sounds perfect! Let's keep racing and perfecting those lanes. 🐕",
        "Arff! Challenge accepted. See you on the leaderboard rankings!",
        "Double jump timing is crucial! Try practicing inside the Lobby park first."
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      const botMsg = {
        sender: 'dog' as const,
        text: randomResponse,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatHistoryMap(prev => ({
        ...prev,
        [target]: [...(prev[target] || []), botMsg]
      }));
      GameAudio.playCollect && GameAudio.playCollect(false, true);
    }, 1000);
  };

  // Stats calculation metrics for current active frame
  const completedAchievementsCount = achievements.filter(a => a.completed).length;
  const ratioAchievements = Math.round((completedAchievementsCount / achievements.length) * 105); // boost styling
  const activeChar = characters.find(c => c.breed === activeBreed) || characters[0];

  // Dynamic values based on who we are viewing
  const renderName = isViewingMe ? (currentUser?.displayName || 'Pro Guest Rider') : activeFriend?.name;
  const renderEmail = isViewingMe ? (currentUser?.email || 'thee4kingsmen@gmail.com') : activeFriend?.email;
  const renderLevel = isViewingMe ? activeChar.level : activeFriend?.level;
  const renderBreed = isViewingMe ? activeChar.breed : activeFriend?.breed;
  const renderPerk = isViewingMe ? `Level ${activeChar.level} Training Bonus` : activeFriend?.specialPerk;
  
  const displayBones = isViewingMe ? userBones : activeFriend?.bones;
  const displayTokens = isViewingMe ? userTokens : activeFriend?.tokens;
  const displayDistance = isViewingMe ? bestDistance : activeFriend?.bestDistance;

  // Stats blocks
  const highestRunStat = isViewingMe ? Math.floor(bestDistance) : activeFriend?.customStats.highestRun;
  const totalBonesEver = isViewingMe ? (userBones + 450) : ((activeFriend?.bones || 0) + (activeFriend?.customStats.bonesSpent || 0));
  const maxCoinsSingle = isViewingMe ? Math.floor(bestDistance * 0.42 + 10) : activeFriend?.customStats.mostCoinsCollected;
  const gamesWonCount = isViewingMe ? 15 : activeFriend?.customStats.gamesWon;
  const recordRunsCount = isViewingMe ? 2 : activeFriend?.customStats.recordRuns;
  const perfectCoursesCount = isViewingMe ? 5 : activeFriend?.customStats.perfectCourses;
  const averageVelocity = isViewingMe ? "11.2 m/s" : `${activeFriend?.customStats.averageSpeed} m/s`;
  const timeSpentRun = isViewingMe ? "14.5 Hours" : activeFriend?.customStats.totalPlayTime;

  // Followers list calculations for current profile
  // If viewing Me, followers are all those in mock profiles
  // If viewing a Friend, we query their friendIds and populate cards
  const activeProfileFollowersCount = isViewingMe 
    ? 248 // nice static baseline
    : activeFriend?.followersCount || 0;

  const activeProfileFollowingCount = isViewingMe
    ? Object.keys(MOCK_PROFILES).filter(k => friendStatusMap[k]).length
    : activeFriend?.followingCount || 0;

  // Friends rendering list
  const getCommunityList = () => {
    if (isViewingMe) {
      if (communityTab === 'following') {
        // Show only those added as friends
        return Object.values(MOCK_PROFILES).filter(p => friendStatusMap[p.id]);
      } else {
        // Show all
        return Object.values(MOCK_PROFILES);
      }
    } else if (activeFriend) {
      // Show friend's connections
      return activeFriend.friendIds.map(fid => MOCK_PROFILES[fid]).filter(Boolean);
    }
    return [];
  };

  const communityItems = getCommunityList();

  return (
    <div id="profile-panel-container" className="w-full max-w-4xl mx-auto p-3 sm:p-5 bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl backdrop-blur-md shadow-2xl relative overflow-visible my-2 sm:my-4 flex flex-col justify-between">
      {/* Background visual graphics */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header utility bar with Back and Close X */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4 w-full relative z-30">
        <div className="flex items-center gap-2">
          {profileHistory.length > 1 ? (
            <button
              onClick={handlePopProfile}
              className="cursor-pointer p-2 bg-slate-800/80 border border-slate-700 hover:bg-slate-700 text-slate-200 rounded-xl leading-none transition-all flex items-center justify-center shadow"
              title="Go back to previous profile"
            >
              <ChevronLeft className="w-4 h-4 mr-0.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider pr-1">Back</span>
            </button>
          ) : (
            <span className="p-1 px-2.5 bg-emerald-500/10 text-emerald-400 font-mono text-[9px] font-bold uppercase tracking-widest rounded border border-emerald-500/20">
              OWNER IDENTITY CARD
            </span>
          )}
        </div>

        {/* Global tab Switcher but with extreme close button */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-950 p-0.5 rounded-xl border border-slate-850/80">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-display font-bold transition-all uppercase tracking-wider ${
                activeTab === 'profile'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Riders & Stats
            </button>
            <button
              onClick={() => setActiveTab('drive_files')}
              className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-display font-bold transition-all uppercase tracking-wider flex items-center gap-1 ${
                activeTab === 'drive_files'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FolderOpen className="w-3 h-3" />
              <span>Drive Explorer</span>
            </button>
          </div>

          {/* Clinical exit X button - Exits strictly to home screen lobby */}
          <button
            onClick={onClose}
            className="cursor-pointer p-2 bg-slate-800/80 border border-slate-700/80 hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-450 text-slate-400 rounded-xl leading-none transition-all flex items-center justify-center shadow"
            title="Exit Profile to Lobby"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {activeTab === 'profile' ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 relative z-21">
          
          {/* LEFT COLUMN: Rider Profile Badge & Quick Cloud controls (5 columns) */}
          <div className="md:col-span-5 flex flex-col gap-4">
            
            {/* Athlete profile passport */}
            <div className="bg-slate-950/85 border border-slate-800/90 rounded-2xl sm:rounded-3xl p-4 flex flex-col items-center text-center relative overflow-hidden shadow-inner">
              
              {/* Online indicator */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">
                <span className={`w-1.5 h-1.5 rounded-full ${isViewingMe && currentUser ? 'bg-emerald-500 animate-pulse' : 'bg-cyan-500'} `} />
                <span className="text-[8px] font-mono font-bold text-slate-400">
                  {isViewingMe ? (currentUser ? 'SYNCED' : 'LOCAL') : 'COMPETITOR'}
                </span>
              </div>

              {/* Backtrack trace notification */}
              {profileHistory.length > 1 && (
                <div className="absolute top-3 left-3 flex items-center bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">
                  <span className="text-[7px] font-mono text-slate-500 font-bold uppercase">Trace Depth {profileHistory.length - 1}</span>
                </div>
              )}

              {/* Centered Avatar details */}
              <div className="relative mt-4 mb-2.5">
                {isViewingMe && currentUser?.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt="avatar"
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-full border-2 border-emerald-500 p-0.5 object-cover shadow-lg shadow-emerald-500/10"
                  />
                ) : (
                  <div className={`w-16 h-16 rounded-full ${isViewingMe ? 'bg-emerald-600' : (activeFriend?.avatarColor || 'bg-slate-800')} border-2 border-slate-700 flex items-center justify-center text-2xl font-display font-black text-slate-200 shadow-md`}>
                    {isViewingMe ? (currentUser?.displayName ? currentUser.displayName[0].toUpperCase() : 'TD') : activeFriend?.avatarLetter}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 rounded-full p-1 border border-slate-950">
                  <Sparkles className="w-3 h-3" />
                </div>
              </div>

              {/* Profile Meta Titles */}
              <h3 className="text-lg font-display font-black text-slate-100 line-clamp-1">
                {renderName}
              </h3>
              <p className="text-[10px] font-mono text-slate-500 line-clamp-1">
                {renderEmail}
              </p>

              {/* Followers and Following friends Counts */}
              <div className="grid grid-cols-2 gap-4 border-t border-slate-850 w-full mt-3.5 pt-3 select-none">
                <div className="text-center">
                  <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-widest leading-none">followers</span>
                  <span className="text-base font-mono font-black text-slate-200 block mt-1">
                    {activeProfileFollowersCount}
                  </span>
                </div>
                <div className="text-center border-l border-slate-850">
                  <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-widest leading-none">friends</span>
                  <span className="text-base font-mono font-black text-slate-200 block mt-1 font-mono">
                    {activeProfileFollowingCount}
                  </span>
                </div>
              </div>

              {/* Connect/Visit Actions */}
              <div className="mt-4 w-full">
                {isViewingMe ? (
                  <>
                    {currentUser ? (
                      <button
                        onClick={handleLogout}
                        className="cursor-pointer w-full py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-450 font-display font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Disconnect Cloud</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleLogin}
                        className="cursor-pointer w-full px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-200 font-display font-black text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 48 48">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                        </svg>
                        <span>Cloud Login</span>
                      </button>
                    )}
                  </>
                ) : (
                  <div className="flex gap-2.5 w-full">
                    <button
                      onClick={() => handleToggleFriend(currentProfileId)}
                      className={`cursor-pointer flex-1 py-1.5 border rounded-xl text-[9px] font-display font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all ${
                        friendStatusMap[currentProfileId]
                          ? 'bg-slate-900 border-slate-750 text-slate-350'
                          : 'bg-emerald-500 hover:scale-103 border-emerald-400 text-slate-950'
                      }`}
                    >
                      {friendStatusMap[currentProfileId] ? (
                        <>
                          <UserMinus className="w-3.5 h-3.5" />
                          <span>Unfriend</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Add Friend</span>
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleSendMessage(currentProfileId)}
                      className="cursor-pointer flex-1 py-1.5 bg-gradient-to-r from-cyan-500 to-indigo-600 border border-cyan-400/30 text-white hover:scale-103 rounded-xl text-[9px] font-display font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Message</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* active/selected athlete stats details */}
            <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-3.5 flex flex-col gap-2.5 select-none text-slate-300">
              <span className="text-[8px] uppercase font-mono font-bold tracking-widest text-slate-500">
                ATHLETIC SKILL PERK
              </span>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-slate-850 rounded-xl border border-emerald-500/30 flex items-center justify-center text-xs font-black text-emerald-450 font-display">
                  LV {renderLevel}
                </div>
                <div>
                  <h4 className="text-xs font-display font-black text-white">{renderBreed}</h4>
                  <p className="text-[10px] text-emerald-400 uppercase font-mono tracking-wider mt-0.5 truncate max-w-[180px]">
                    {renderPerk}
                  </p>
                </div>
              </div>
            </div>
            
          </div>

          {/* RIGHT COLUMN: Total Stats & Friends/Followers Community Sub-tables (7 columns) */}
          <div className="md:col-span-7 flex flex-col gap-4">
            
            {/* Extended Career Stats Block */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              
              <div className="bg-gradient-to-br from-slate-950 to-slate-900/60 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg">
                <Trophy className="w-4.5 h-4.5 text-yellow-400 fill-yellow-400/5 mb-1" />
                <div>
                  <span className="text-[8px] font-mono text-slate-500 uppercase font-black uppercase block">Personal Record</span>
                  <p className="text-lg font-mono font-black text-slate-150 mt-0.5">
                    {highestRunStat}<span className="text-[9px] ml-1 text-slate-400">meters</span>
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-950 to-slate-900/60 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg">
                <Bone className="w-4.5 h-4.5 text-orange-500 fill-orange-500/5 mb-1" />
                <div>
                  <span className="text-[8px] font-mono text-slate-500 uppercase font-black uppercase block">All-Time Bones</span>
                  <p className="text-lg font-mono font-black text-slate-150 mt-0.5">
                    {totalBonesEver}<span className="text-[9px] ml-1 text-slate-400">bones</span>
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-950 to-slate-900/60 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg">
                <Award className="w-4.5 h-4.5 text-cyan-400 mb-1" />
                <div>
                  <span className="text-[8px] font-mono text-slate-500 uppercase font-black uppercase block">Single Run Best</span>
                  <p className="text-lg font-mono font-black text-slate-150 mt-0.5">
                    {maxCoinsSingle}<span className="text-[9px] ml-1 text-slate-400">bones</span>
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-950 to-slate-900/60 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg">
                <ShieldCheck className="w-4.5 h-4.5 text-emerald-405 mb-1" />
                <div>
                  <span className="text-[8px] font-mono text-slate-500 uppercase font-black uppercase block">Competitive Wins</span>
                  <p className="text-lg font-mono font-black text-slate-150 mt-0.5">
                    {gamesWonCount}<span className="text-[9px] ml-1 text-slate-400">Podiums</span>
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-950 to-slate-900/60 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg">
                <Settings className="w-4.5 h-4.5 text-indigo-400 mb-1" />
                <div>
                  <span className="text-[8px] font-mono text-slate-500 uppercase font-black uppercase block">Perfect Clear Trails</span>
                  <p className="text-md sm:text-lg font-mono font-black text-slate-150 mt-0.5">
                    {perfectCoursesCount}<span className="text-[9px] ml-1 text-slate-400">courses</span>
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-950 to-slate-900/60 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg">
                <Sparkles className="w-4.5 h-4.5 text-teal-400 mb-1" />
                <div>
                  <span className="text-[8px] font-mono text-slate-500 uppercase font-black uppercase block">Record Speed / Hours</span>
                  <p className="text-xs sm:text-sm font-mono font-black text-slate-150 mt-0.5 truncate leading-tight">
                    {averageVelocity} <span className="block text-[9px] text-slate-400 font-semibold mt-0.5">{timeSpentRun} played</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Dynamic Community lists: Followers & Following tab container */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3 sm:p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <span className="text-xs font-display font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-450" />
                    <span>Lobby Athletes</span>
                  </span>
                </div>

                {isViewingMe && (
                  <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                    <button
                      onClick={() => setCommunityTab('followers')}
                      className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase transition-all tracking-wider cursor-pointer ${
                        communityTab === 'followers' ? 'bg-slate-850 text-slate-100' : 'text-slate-500 hover:text-slate-350'
                      }`}
                    >
                      All / Followers
                    </button>
                    <button
                      onClick={() => setCommunityTab('following')}
                      className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase transition-all tracking-wider cursor-pointer ${
                        communityTab === 'following' ? 'bg-slate-850 text-slate-100' : 'text-slate-350 hover:text-slate-350'
                      }`}
                    >
                      Friends
                    </button>
                  </div>
                )}
              </div>

              {/* Lists values */}
              <div className="flex flex-col gap-2 max-h-[190px] overflow-y-auto pr-1 select-none scrollbar-thin scrollbar-thumb-slate-800">
                {communityItems.length === 0 ? (
                  <div className="p-4 bg-slate-900/30 text-center text-[10px] text-slate-500 font-medium font-mono uppercase border border-slate-850/60 rounded-xl">
                    No matching friends in range. Click "Add Friend" below!
                  </div>
                ) : (
                  communityItems.map((item) => {
                    const isFr = friendStatusMap[item.id];
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleVisitProfile(item.id)}
                        className="cursor-pointer p-2.5 bg-slate-900 hover:bg-slate-850/80 border border-slate-800/50 hover:border-slate-750 rounded-xl flex items-center justify-between gap-3 transition-all transform hover:scale-[1.01]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-full ${item.avatarColor} flex items-center justify-center text-xs font-black text-white`}>
                            {item.avatarLetter}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-black text-slate-150 truncate leading-none block">
                                {item.name}
                              </span>
                              <span className="text-[8px] bg-slate-950 text-orange-400 border border-orange-500/20 rounded-md px-1 font-bold leading-none py-0.5 uppercase tracking-wide">
                                LV{item.level}
                              </span>
                            </div>
                            <span className="text-[9px] text-slate-400 font-mono block mt-1 truncate">
                              PR: {item.bestDistance}m • {item.breed}
                            </span>
                          </div>
                        </div>

                        {/* Interactive operations block */}
                        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleSendMessage(item.id)}
                            className="cursor-pointer p-1 px-2 bg-slate-800/80 border border-slate-750 hover:bg-slate-750 text-slate-200 transition-all rounded-lg text-[9px] font-black uppercase flex items-center gap-1"
                            title="Interactive Message chat"
                          >
                            <MessageSquare className="w-3 h-3 text-cyan-400" />
                            <span className="hidden sm:inline">Chat</span>
                          </button>
                          
                          <button
                            onClick={() => handleToggleFriend(item.id)}
                            className={`p-1 px-1.5 rounded-lg text-[9px] leading-tight flex items-center transition-all cursor-pointer ${
                              isFr 
                                ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' 
                                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                            }`}
                            title="Toggle Friend status"
                          >
                            <Heart className={`w-3 h-3 ${isFr ? 'fill-emerald-500' : ''}`} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* GOOGLE DRIVE EXPLORER TAB (Fits mobile screens flawlessly, clear guidance) */
        <div className="flex flex-col gap-4 relative z-21">
          {!currentUser ? (
            <div className="text-center bg-slate-950/40 border border-slate-800 rounded-3xl p-6 py-8 flex flex-col items-center justify-center gap-4">
              <FolderOpen className="w-10 h-10 text-slate-705 animate-pulse" />
              <div>
                <h3 className="text-base font-display font-black text-slate-300 uppercase">
                  Google Drive Integrations (Backup & Import)
                </h3>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                  Connect your custom folder assets, soundtracks, or backup records to synchronize them across devices seamlessly.
                </p>
              </div>
              <button
                onClick={handleLogin}
                className="cursor-pointer mt-1 px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-950 font-display font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 shadow"
              >
                <FolderOpen className="w-4 h-4 text-emerald-500" />
                <span>Connect Google Drive</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Asset guide and automatic generator */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="text-xs font-display font-black text-white uppercase flex items-center gap-1.5">
                    <Music className="w-4 h-4 text-emerald-400" />
                    <span>Real Google Drive Asset Loader</span>
                  </h3>
                  <p className="text-[10px] text-slate-405 mt-1 font-mono leading-relaxed">
                    Place custom soundtracks (.mp3/.wav) or GLB modules in your Google Drive file list, or trigger demo files below.
                  </p>
                </div>

                <button
                  onClick={handleCreateDemoFiles}
                  className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-display font-bold text-[9px] uppercase tracking-widest rounded-lg transition-all cursor-pointer"
                >
                  Generate Demo files
                </button>
              </div>

              {/* Status card configuration metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                <div className="bg-slate-950/40 border border-slate-800 p-3.5 rounded-2xl flex items-center gap-3 shadow-inner">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <Disc className={`w-4 h-4 text-emerald-400 ${activeMusicName ? 'animate-spin-slow' : ''}`} />
                  </div>
                  <div className="min-w-0 flex-grow">
                    <span className="text-[8px] uppercase font-mono font-bold text-slate-500 leading-none">ACTIVE USER SOUNDTRACK</span>
                    <span className="text-xs font-mono font-semibold text-slate-1 py-0.5 mt-1 block truncate">
                      {activeMusicName || 'Arcade Original Synthesizer'}
                    </span>
                  </div>
                  {activeMusicName && (
                    <button
                      onClick={() => {
                        onMusicLoaded(null, '');
                        alert('Restored default arcade environment background tunes!');
                      }}
                      className="text-[9px] text-rose-455 font-mono underline hover:text-rose-400 ml-1 cursor-pointer flex-shrink-0"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div className="bg-slate-950/40 border border-slate-800 p-3.5 rounded-2xl flex items-center gap-3 shadow-inner">
                  <div className="w-9 h-9 rounded-full bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="min-w-0 flex-grow">
                    <span className="text-[8px] uppercase font-mono font-bold text-slate-500 leading-none">ACTIVE COMPANION MODEL</span>
                    <span className="text-xs font-mono font-semibold text-slate-1 py-0.5 mt-1 block truncate">
                      {customDogSkin || 'Procedural Canine Vectors'}
                    </span>
                  </div>
                  {customDogSkin && (
                    <button
                      onClick={() => {
                        onSetCustomSkin('');
                        localStorage.removeItem('topdog_custom_skin_file_id');
                        localStorage.removeItem('topdog_custom_skin_name');
                        if (onSetCustomModelBuffer) onSetCustomModelBuffer(null);
                        alert('Restored default procedurally-designed voxel pets!');
                      }}
                      className="text-[9px] text-rose-455 font-mono underline hover:text-rose-400 ml-1 cursor-pointer flex-shrink-0"
                    >
                      Clear
                    </button>
                  )}
                </div>

              </div>

              {/* Cloud automatic Sync backup controls */}
              <div className="bg-emerald-950/10 border border-emerald-900/40 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <CloudLightning className="w-4.5 h-4.5 text-emerald-400 animate-pulse" />
                  <div>
                    <h4 className="text-[10px] font-display font-black text-emerald-300 uppercase tracking-widest leading-none">Secure Google Drive Backup synchronization</h4>
                    <p className="text-[9px] text-emerald-500 font-mono mt-1">Saves active coins stats, highscores and evolutions as topdog_stats_backup.json</p>
                  </div>
                </div>

                {backupStatusMessage && (
                  <div className="bg-slate-950 border border-emerald-500/20 text-[10px] text-orange-450 p-2.5 rounded-xl font-semibold">
                    {backupStatusMessage}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 w-full">
                  <button
                    disabled={isBackupLoading}
                    onClick={handleBackup}
                    className="cursor-pointer py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-display font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isBackupLoading ? 'animate-spin' : ''}`} />
                    <span>Backup stats</span>
                  </button>

                  <button
                    disabled={isRestoreLoading}
                    onClick={handleRestore}
                    className="cursor-pointer py-1.5 bg-slate-950 border border-emerald-800 hover:bg-slate-900 text-emerald-400 font-display font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRestoreLoading ? 'animate-spin' : ''}`} />
                    <span>Sync restore</span>
                  </button>
                </div>
              </div>

              {/* Drive list files */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-display font-black text-slate-400 uppercase tracking-widest">
                    Google Drive Files ({driveFiles.length})
                  </h4>
                  <button
                    onClick={() => loadDriveContent(accessToken!)}
                    className="p-1 px-2.5 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded text-[9px] font-mono uppercase border border-slate-800 transition-all cursor-pointer"
                  >
                    Refresh List
                  </button>
                </div>
                {driveFiles.length === 0 ? (
                  <div className="bg-slate-950/30 border border-slate-850 rounded-2xl p-6 text-center text-slate-500 text-[11px] font-mono uppercase">
                    No compatible .mp3, .wav, or GLB assets found in directory. Tap "Generate Demo files" to load mockup media!
                  </div>
                ) : (
                  <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-900/60 w-full max-h-[220px] overflow-y-auto">
                    {driveFiles.map((file) => {
                      const isMusic = file.name.endsWith('.mp3') || file.name.endsWith('.wav');
                      const isBackup = file.name === 'topdog_stats_backup.json';
                      const isModel = file.name.endsWith('.glb') || file.name.endsWith('.gltf');

                      return (
                        <div key={file.id} className="p-3 hover:bg-slate-900/40 flex items-center justify-between gap-4 transition-all">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {isMusic && <Music className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                            {isModel && <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0" />}
                            {isBackup && <FileCode className="w-4 h-4 text-indigo-400 flex-shrink-0" />}
                            
                            <div className="min-w-0 max-w-[190px] sm:max-w-xs">
                              <p className="text-[11px] font-semibold text-slate-200 truncate pr-2 leading-snug">
                                {file.name}
                              </p>
                              <p className="text-[9px] font-mono text-slate-500 truncate">
                                {file.mimeType} • {file.size ? (parseInt(file.size)/1024/1024).toFixed(2)+' MB' : 'KB file'}
                              </p>
                            </div>
                          </div>

                          <div className="flex-shrink-0">
                            {isMusic && (
                              <button
                                disabled={isMusicDownloading !== null}
                                onClick={() => handleSelectDriveMusic(file)}
                                className="cursor-pointer px-2.5 py-1 bg-gradient-to-r from-emerald-520 to-teal-520 text-slate-950 font-display font-black text-[9px] uppercase tracking-wider rounded shadow flex items-center gap-1 transition-all hover:scale-103"
                              >
                                {isMusicDownloading === file.name ? (
                                  <>
                                    <RefreshCw className="w-2.5 h-2.5 animate-spin text-slate-950" />
                                    <span>Syncing...</span>
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-2.5 h-2.5 text-slate-950 fill-current" />
                                    <span>Import</span>
                                  </>
                                )}
                              </button>
                            )}

                            {isModel && (
                              <button
                                onClick={() => handleLoadCustomSkin(file)}
                                className="cursor-pointer px-2.5 py-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-display font-black text-[9px] uppercase tracking-wider rounded shadow flex items-center gap-1 transition-all hover:scale-103"
                              >
                                <Sparkles className="w-2.5 h-2.5 text-white" />
                                <span>Inject Skin</span>
                              </button>
                            )}

                            {isBackup && (
                              <button
                                onClick={handleRestore}
                                className="cursor-pointer px-2.5 py-1 bg-indigo-500/10 hover:bg-slate-900 border border-indigo-500/30 text-indigo-300 font-display font-black text-[9px] uppercase tracking-wider rounded flex items-center gap-1 transition-all"
                              >
                                <RefreshCw className="w-2.5 h-2.5" />
                                <span>Restore</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* FLOAT INTERACTIVE CHAT POPUP/MODAL OVERLAY FOR MULTI-PROFILE COMMUNICATION */}
      {chatTargetId && MOCK_PROFILES[chatTargetId] && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in select-none">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl relative">
            
            {/* Header bar */}
            <div className={`p-3.5 bg-gradient-to-r from-slate-950 to-slate-900 border-b border-slate-800 flex items-center justify-between`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-full ${MOCK_PROFILES[chatTargetId].avatarColor} flex items-center justify-center text-xs font-black text-white`}>
                  {MOCK_PROFILES[chatTargetId].avatarLetter}
                </div>
                <div>
                  <h4 className="text-xs font-display font-black text-slate-100 uppercase tracking-widest">
                    {MOCK_PROFILES[chatTargetId].name}
                  </h4>
                  <span className="text-[8px] bg-slate-950 text-emerald-400 border border-emerald-500/20 rounded px-1 font-bold font-mono tracking-wide mt-0.5 inline-block uppercase">
                    online
                  </span>
                </div>
              </div>
              
              <button
                onClick={() => setChatTargetId(null)}
                className="cursor-pointer p-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-400 rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Messages box list scrolling and auto-anchoring */}
            <div className="p-3 flex-grow overflow-y-auto max-h-[290px] min-h-[200px] flex flex-col gap-2.5 scrollbar-thin scrollbar-thumb-slate-800">
              {chatHistoryMap[chatTargetId]?.map((msg, i) => {
                const isUser = msg.sender === 'user';
                return (
                  <div
                    key={i}
                    className={`max-w-[85%] flex flex-col gap-0.5 ${isUser ? 'self-end items-end' : 'self-start items-start'}`}
                  >
                    <div className={`p-2.5 rounded-xl text-[11px] leading-relaxed font-sans ${isUser ? 'bg-emerald-500 text-slate-950 font-semibold rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none'}`}>
                      {msg.text}
                    </div>
                    <span className="text-[7.5px] font-mono text-slate-550 mr-1 ml-1 mt-0.5">{msg.time}</span>
                  </div>
                );
              })}
              <div ref={chatBottomRef} />
            </div>

            {/* Input message fields */}
            <div className="p-2.5 bg-slate-950/70 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                placeholder="Type your runner quote..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitChatMessage()}
                className="bg-slate-900 border border-slate-800 text-xs text-slate-200 px-3 py-1.5 rounded-xl flex-grow focus:outline-none focus:border-emerald-500/60"
              />
              <button
                onClick={submitChatMessage}
                className="cursor-pointer p-2 bg-emerald-500 hover:bg-emerald-450 border border-emerald-450 rounded-xl flex items-center justify-center transition-all hover:scale-103"
              >
                <Send className="w-3.5 h-3.5 text-slate-950 fill-current" />
              </button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
};
