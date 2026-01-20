import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Users,
  Plus,
  TrendingUp,
  DollarSign,
  Check,
  ExternalLink,
  Copy,
  AlertTriangle,
  Zap,
  ArrowRight,
  Flame,
} from 'lucide-react';

const supabase = createClient(
  'https://ikoqldnbuwulyzpurlyv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlrb3FsZG5idXd1bHl6cHVybHl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDI5OTQsImV4cCI6MjA4NDM3ODk5NH0.QKz1CigzkMKjbxKb-Kvqruk1P2DSxBHi9ktWx8s23Fk'
);

const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);

const haptic = (type = 'light') => {
  if (window.navigator.vibrate) {
    const patterns = { light: [10], medium: [20], heavy: [30] };
    window.navigator.vibrate(patterns[type] || [10]);
  }
};

const openPaymentApp = (type: string, username: string, amount: number, note: string) => {
  if (type === 'venmo') {
    const deepLink = `venmo://paycharge?txn=pay&recipients=${username}&amount=${amount}&note=${encodeURIComponent(note)}`;
    const webFallback = `https://venmo.com/${username}`;
    window.location.href = deepLink;
    setTimeout(() => {
      if (document.hidden === false) window.location.href = webFallback;
    }, 1500);
  }
  if (type === 'cashapp') {
    const cleanTag = username.replace('$', '');
    const deepLink = `cashapp://cash.app/$${cleanTag}/${amount}`;
    const webFallback = `https://cash.app/$${cleanTag}/${amount}`;
    window.location.href = deepLink;
    setTimeout(() => {
      if (document.hidden === false) window.location.href = webFallback;
    }, 1500);
  }
  if (type === 'zelle') {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(username);
      alert(`Zelle email copied!\n${username}\n\nOpen your banking app to send $${amount}`);
    }
  }
};

const generateInviteCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

export default function PredictionApp() {
  const [currentView, setCurrentView] = useState('login');
  const [user, setUser] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [selectedPrediction, setSelectedPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  
  useEffect(() => {
    setIsInstalled(
      window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true
    );
    const savedUser = localStorage.getItem('vyre_user');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      setCurrentView('groups');
      loadUserGroups(userData.id);
    }
  }, []);

  const loadUserGroups = async (userId: string) => {
    setLoading(true);
    try {
      const { data: memberData } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId);
      const groupIds = (memberData || []).map(m => m.group_id);
      if (groupIds.length > 0) {
        const { data: groupsData } = await supabase
          .from('groups')
          .select('*')
          .in('id', groupIds);
        setGroups(groupsData || []);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGroupPredictions = async (groupId: string) => {
    setLoading(true);
    try {
      const { data: predsData } = await supabase
        .from('predictions')
        .select('*')
        .eq('group_id', groupId);
      const predictionsWithCommitments = await Promise.all(
        (predsData || []).map(async (pred) => {
          const { data: commitsData } = await supabase
            .from('commitments')
            .select('*, profiles:user_id(id, phone, name)')
            .eq('prediction_id', pred.id);
          return {
            ...pred,
            commitments: (commitsData || []).map(c => ({
              userId: c.user_id,
              userName: c.profiles?.name || c.profiles?.phone || 'Unknown',
              side: c.side,
              amount: parseFloat(c.amount),
              venmoUsername: c.venmo_username,
              cashAppTag: c.cashapp_tag,
            })),
          };
        })
      );
      setPredictions(predictionsWithCommitments);
    } catch (error) {
      console.error('Error loading predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (phone: string) => {
    if (!phone) return;
    haptic('medium');
    setLoading(true);
    try {
      let { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', phone)
        .single();
      if (!profileData) {
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert([{ phone, name: phone }])
          .select()
          .single();
        profileData = newProfile;
      }
      setUser(profileData);
      localStorage.setItem('vyre_user', JSON.stringify(profileData));
      await loadUserGroups(profileData.id);
      setCurrentView('groups');
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (name: string) => {
    if (!name || !user) return;
    haptic('medium');
    setLoading(true);
    try {
      const inviteCode = generateInviteCode();
      const { data: groupData } = await supabase
        .from('groups')
        .insert([{ name, invite_code: inviteCode, created_by: user.id }])
        .select()
        .single();
      await supabase
        .from('group_members')
        .insert([{ group_id: groupData.id, user_id: user.id }]);
      setGroups([...groups, groupData]);
      setCurrentView('groups');
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePrediction = async (predictionData: any) => {
    if (!selectedGroup || !user) return;
    haptic('heavy');
    setLoading(true);
    try {
      const { data: predData } = await supabase
        .from('predictions')
        .insert([{
          group_id: selectedGroup.id,
          title: predictionData.title,
          side_a_label: predictionData.sideALabel,
          side_b_label: predictionData.sideBLabel,
          status: 'open',
          created_by: user.id,
        }])
        .select()
        .single();
      await supabase
        .from('commitments')
        .insert([{
          prediction_id: predData.id,
          user_id: user.id,
          side: predictionData.initialSide,
          amount: predictionData.initialAmount,
          venmo_username: 'demo-user',
          cashapp_tag: '$demouser',
        }]);
      await loadGroupPredictions(selectedGroup.id);
      setCurrentView('prediction');
    } catch (error) {
      console.error('Error creating prediction:', error);
      alert('Failed to create prediction.');
    } finally {
      setLoading(false);
    }
  };

  const calculatePoolStats = (commitments: any[]) => {
    const sideA = commitments.filter(c => c.side === 'a').reduce((sum, c) => sum + c.amount, 0);
    const sideB = commitments.filter(c => c.side === 'b').reduce((sum, c) => sum + c.amount, 0);
    return { sideATotal: sideA, sideBTotal: sideB, totalPool: sideA + sideB };
  };

  const calculateSettlement = (prediction: any, winningSide: string) => {
    const stats = calculatePoolStats(prediction.commitments);
    const sideTotal = winningSide === 'a' ? stats.sideATotal : stats.sideBTotal;
    const winners = prediction.commitments
      .filter((c: any) => c.side === winningSide)
      .map((c: any) => ({
        ...c,
        payout: (c.amount / sideTotal) * stats.totalPool,
        profit: (c.amount / sideTotal) * stats.totalPool - c.amount,
      }));
    const losers = prediction.commitments
      .filter((c: any) => c.side !== winningSide)
      .map((c: any) => ({ ...c, loss: c.amount }));
    return { winners, losers };
  };

  if (currentView === 'login') {
    return <LoginView onLogin={handleLogin} isInstalled={isInstalled} loading={loading} />;
  }
  if (currentView === 'groups') {
    return (
      <GroupsView 
        groups={groups} 
        onSelectGroup={(g: any) => {
          haptic('light');
          setSelectedGroup(g);
          loadGroupPredictions(g.id);
          setCurrentView('prediction');
        }}
        onCreateGroup={() => {
          haptic('light');
          setCurrentView('createGroup');
        }}
        loading={loading}
      />
    );
  }
  if (currentView === 'createGroup') {
    return <CreateGroupView onCreate={handleCreateGroup} onBack={() => setCurrentView('groups')} loading={loading} />;
  }
  if (currentView === 'prediction') {
    return (
      <PredictionListView
        group={selectedGroup}
        predictions={predictions}
        onSelectPrediction={(p: any) => {
          haptic('light');
          setSelectedPrediction(p);
        }}
        onCreatePrediction={() => setCurrentView('createPrediction')}
        onBack={() => setCurrentView('groups')}
        loading={loading}
      />
    );
  }
  if (currentView === 'createPrediction') {
    return (
      <CreatePredictionView
        onCreate={handleCreatePrediction}
        onBack={() => setCurrentView('prediction')}
        loading={loading}
      />
    );
  }
  return <div className="p-4">Loading...</div>;
}

const LoginView = ({ onLogin, isInstalled, loading }: any) => {
  const [phone, setPhone] = useState('');
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-cyan-900/20"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      <div className="relative z-10 w-full max-w-md">
        {!isInstalled && isIOS() && (
          <div className="mb-6 p-4 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20 rounded-2xl backdrop-blur-xl">
            <p className="font-bold text-purple-300 mb-1 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Install for best experience
            </p>
            <p className="text-cyan-300/80 text-xs">Tap Share → Add to Home Screen</p>
          </div>
        )}
        <div className="text-center mb-8">
          <img
            src="https://i.imgur.com/S3VZl4y.png"
            alt="VYRE Logo"
            className="w-80 h-80 mx-auto mb-2 drop-shadow-2xl"
            style={{filter: 'drop-shadow(0 0 40px rgba(168, 85, 247, 0.6))'}}
          />
          <h1 className="text-7xl font-black mb-3 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
            VYRE
          </h1>
          <p className="text-cyan-300/60 text-sm tracking-wide">Private predictions • Zero fees • Pure competition</p>
        </div>
        <div className="space-y-4 backdrop-blur-xl bg-white/5 p-6 rounded-3xl border border-white/10 shadow-2xl">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-5 py-4 text-base bg-black/40 border-2 border-purple-500/30 rounded-2xl focus:border-purple-500 focus:outline-none text-white placeholder-gray-500 transition-all"
            placeholder="Enter your phone number"
            style={{ fontSize: '16px' }}
          />
          <button
            onClick={() => onLogin(phone)}
            disabled={loading || !phone}
            className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white py-4 rounded-2xl font-bold text-lg hover:from-purple-500 hover:to-cyan-500 transition-all flex items-center justify-center gap-3 shadow-lg shadow-purple-500/50 hover:shadow-purple-500/70 active:scale-98 disabled:opacity-50"
            style={{ minHeight: '56px' }}
          >
            {loading ? 'Authenticating...' : (
              <>
                <Zap className="w-5 h-5" />
                Authenticate
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
          <p className="text-xs text-gray-500 text-center pt-2">We'll send a 6-digit code to your phone</p>
        </div>
      </div>
    </div>
  );
};

const GroupsView = ({ groups, onSelectGroup, onCreateGroup, loading }: any) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const handleShareGroup = (group: any, e: React.MouseEvent) => {
    e.stopPropagation();
    haptic('light');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(group.invite_code);
      setCopiedCode(group.id);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };
  return (
    <div className="min-h-screen bg-black">
      <div className="sticky top-0 bg-gradient-to-b from-black via-black/95 to-transparent backdrop-blur-xl border-b border-purple-500/20 px-4 py-6 z-10">
        <div className="flex justify-between items-center max-w-2xl mx-auto">
          <div>
            <h1 className="text-2xl font-black text-white mb-1">Your Groups</h1>
            <p className="text-cyan-400/60 text-sm">Create • Join • Compete</p>
          </div>
          <button
            onClick={onCreateGroup}
            disabled={loading}
            className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold shadow-lg shadow-purple-500/50 hover:shadow-purple-500/70 active:scale-95 transition-all disabled:opacity-50"
            style={{ minHeight: '48px' }}
          >
            <Plus className="w-5 h-5" />
            New
          </button>
        </div>
      </div>
      <div className="max-w-2xl mx-auto p-4">
        {loading ? (
          <div className="text-center text-purple-400 mt-8">Loading groups...</div>
        ) : groups.length === 0 ? (
          <div className="backdrop-blur-xl bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border border-purple-500/20 rounded-3xl p-12 text-center mt-8">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-purple-400" />
            </div>
            <p className="text-gray-400 text-lg mb-4">No groups yet</p>
            <p className="text-gray-600 text-sm">Create your first group to start making predictions</p>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {groups.map((group: any) => (
              <div
                key={group.id}
                onClick={() => onSelectGroup(group)}
                className="backdrop-blur-xl bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20 p-6 rounded-3xl hover:border-purple-500/40 active:scale-98 transition-all cursor-pointer shadow-lg"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-xl mb-1">{group.name}</h3>
                    <p className="text-cyan-400/60 text-sm flex items-center gap-2">
                      <Zap className="w-3 h-3" />
                      Code: {group.invite_code}
                    </p>
                  </div>
                  <ArrowRight className="w-6 h-6 text-purple-400" />
                </div>
                <button
                  onClick={(e) => handleShareGroup(group, e)}
                  className="w-full mt-3 bg-gradient-to-r from-cyan-600/20 to-purple-600/20 border border-cyan-500/30 text-cyan-300 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:border-cyan-500/50 active:scale-98 transition-all"
                >
                  {copiedCode === group.id ? (
                    <>
                      <Check className="w-4 h-4" />
                      Code Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Share Invite Code
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const CreateGroupView = ({ onCreate, onBack, loading }: any) => {
  const [name, setName] = useState('');
  return (
    <div className="min-h-screen bg-black">
      <div className="sticky top-0 bg-black/95 backdrop-blur-xl border-b border-purple-500/20 px-4 py-4">
        <button onClick={onBack} disabled={loading} className="text-purple-400 font-bold flex items-center gap-2 hover:text-purple-300 transition-colors disabled:opacity-50">
          <ArrowRight className="w-5 h-5 rotate-180" />
          Back
        </button>
      </div>
      <div className="max-w-md mx-auto p-6">
        <div className="mb-8">
          <h2 className="text-3xl font-black text-white mb-2">Create Group</h2>
          <p className="text-cyan-400/60">Name your prediction squad</p>
        </div>
        <div className="space-y-6">
          <div>
            <label className="block text-purple-300 font-bold mb-3 text-sm uppercase tracking-wide">Group Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              className="w-full px-5 py-4 text-base bg-black/40 border-2 border-purple-500/30 rounded-2xl focus:border-purple-500 focus:outline-none text-white placeholder-gray-600 transition-all disabled:opacity-50"
              placeholder="Weekend Warriors"
              style={{ fontSize: '16px', minHeight: '56px' }}
            />
          </div>
          <button
            onClick={() => name && onCreate(name)}
            disabled={!name || loading}
            className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white py-4 rounded-2xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/50 hover:shadow-purple-500/70 active:scale-98 transition-all"
            style={{ minHeight: '56px' }}
          >
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
};

const PredictionListView = ({ group, predictions, onSelectPrediction, onCreatePrediction, onBack, loading }: any) => {
  const [copiedPrediction, setCopiedPrediction] = useState<string | null>(null);
  const calculatePoolStats = (commitments: any[]) => {
    const sideA = commitments.filter(c => c.side === 'a').reduce((sum, c) => sum + c.amount, 0);
    const sideB = commitments.filter(c => c.side === 'b').reduce((sum, c) => sum + c.amount, 0);
    return { sideATotal: sideA, sideBTotal: sideB, totalPool: sideA + sideB };
  };
  const handleSharePrediction = (pred: any, e: React.MouseEvent) => {
    e.stopPropagation();
    haptic('light');
    const shareText = `Join my VYRE prediction: "${pred.title}" - ${pred.side_a_label} vs ${pred.side_b_label}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      setCopiedPrediction(pred.id);
      setTimeout(() => setCopiedPrediction(null), 2000);
    }
  };
  return (
    <div className="min-h-screen bg-black">
      <div className="sticky top-0 bg-gradient-to-b from-black via-black/95 to-transparent backdrop-blur-xl border-b border-purple-500/20 px-4 py-6 z-10">
        <button onClick={onBack} className="text-purple-400 font-bold mb-4 flex items-center gap-2 hover:text-purple-300 transition-colors">
          <ArrowRight className="w-5 h-5 rotate-180" />
          Back
        </button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-white mb-1">{group?.name}</h1>
            <p className="text-cyan-400/60 text-sm flex items-center gap-2">
              <Flame className="w-3 h-3" />
              Live Predictions
            </p>
          </div>
          <button
            onClick={onCreatePrediction}
            disabled={loading}
            className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold shadow-lg shadow-purple-500/50 active:scale-95 transition-all disabled:opacity-50"
            style={{ minHeight: '48px' }}
          >
            <Plus className="w-5 h-5" />
            New
          </button>
        </div>
      </div>
      <div className="max-w-2xl mx-auto p-4">
        {loading ? (
          <div className="text-center text-purple-400 mt-8">Loading predictions...</div>
        ) : predictions.length === 0 ? (
          <div className="backdrop-blur-xl bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border border-purple-500/20 rounded-3xl p-12 text-center mt-8">
            <TrendingUp className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <p className="text-gray-400">No predictions yet</p>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {predictions.map((pred: any) => {
              const stats = calculatePoolStats(pred.commitments || []);
              return (
                <div
                  key={pred.id}
                  className="backdrop-blur-xl bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20 p-6 rounded-3xl hover:border-purple-500/40 transition-all"
                >
                  <div onClick={() => onSelectPrediction(pred)} className="cursor-pointer">
                    <h3 className="font-bold text-white text-lg mb-4">{pred.title}</h3>
                    <div className="flex justify-between items-center mb-3">
                      <div className="text-center flex-1">
                        <div className="text-purple-400 text-sm mb-1">{pred.side_a_label}</div>
                        <div className="text-2xl font-black text-white">${stats.sideATotal}</div>
                      </div>
                      <div className="text-cyan-400 text-xs">VS</div>
                      <div className="text-center flex-1">
                        <div className="text-cyan-400 text-sm mb-1">{pred.side_b_label}</div>
                        <div className="text-2xl font-black text-white">${stats.sideBTotal}</div>
                      </div>
                    </div>
                    <div className="text-center mb-4">
                      <span className="text-xs text-gray-500">Total Pool: </span>
                      <span className="text-sm font-bold text-purple-400">${stats.totalPool}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleSharePrediction(pred, e)}
                    className="w-full bg-gradient-to-r from-cyan-600/20 to-purple-600/20 border border-cyan-500/30 text-cyan-300 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:border-cyan-500/50 active:scale-98 transition-all"
                  >
                    {copiedPrediction === pred.id ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4" />
                        Share Prediction
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const CreatePredictionView = ({ onCreate, onBack, loading }: any) => {
  const [title, setTitle] = useState('');
  const [sideALabel, setSideALabel] = useState('Yes');
  const [sideBLabel, setSideBLabel] = useState('No');
  const [initialSide, setInitialSide] = useState('a');
  const [initialAmount, setInitialAmount] = useState('');
  return (
    <div className="min-h-screen bg-black">
      <div className="sticky top-0 bg-black/95 backdrop-blur-xl border-b border-purple-500/20 px-4 py-4">
        <button onClick={onBack} disabled={loading} className="text-purple-400 font-bold flex items-center gap-2 disabled:opacity-50">
          <ArrowRight className="w-5 h-5 rotate-180" />
          Back
        </button>
      </div>
      <div className="max-w-md mx-auto p-6">
        <div className="mb-8">
          <h2 className="text-3xl font-black text-white mb-2">New Prediction</h2>
          <p className="text-cyan-400/60">Set the terms & make your call</p>
        </div>
        <div className="space-y-6">
          <div>
            <label className="block text-purple-300 font-bold mb-3 text-sm uppercase tracking-wide">Prediction</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              className="w-full px-5 py-4 text-base bg-black/40 border-2 border-purple-500/30 rounded-2xl focus:border-purple-500 focus:outline-none text-white placeholder-gray-600 disabled:opacity-50"
              placeholder="Chiefs win the Super Bowl"
              style={{ fontSize: '16px', minHeight: '56px' }}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-purple-300 font-bold mb-3 text-sm uppercase tracking-wide">Side A</label>
              <input
                type="text"
                value={sideALabel}
                onChange={(e) => setSideALabel(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 text-base bg-black/40 border-2 border-purple-500/30 rounded-2xl focus:border-purple-500 focus:outline-none text-white disabled:opacity-50"
                style={{ fontSize: '16px' }}
              />
            </div>
            <div>
              <label className="block text-cyan-300 font-bold mb-3 text-sm uppercase tracking-wide">Side B</label>
              <input
                type="text"
                value={sideBLabel}
                onChange={(e) => setSideBLabel(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 text-base bg-black/40 border-2 border-cyan-500/30 rounded-2xl focus:border-cyan-500 focus:outline-none text-white disabled:opacity-50"
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>
          <div>
            <label className="block text-purple-300 font-bold mb-3 text-sm uppercase tracking-wide">Your Pick</label>
            <select
              value={initialSide}
              onChange={(e) => setInitialSide(e.target.value)}
              disabled={loading}
              className="w-full px-5 py-4 text-base bg-black/40 border-2 border-purple-500/30 rounded-2xl focus:border-purple-500 focus:outline-none text-white disabled:opacity-50"
              style={{ fontSize: '16px', minHeight: '56px' }}
            >
              <option value="a">{sideALabel}</option>
              <option value="b">{sideBLabel}</option>
            </select>
          </div>
          <div>
            <label className="block text-purple-300 font-bold mb-3 text-sm uppercase tracking-wide">Your Amount</label>
            <div className="relative">
              <span className="absolute left-5 top-5 text-gray-500 text-xl">$</span>
              <input
                type="number"
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                disabled={loading}
                className="w-full pl-12 pr-5 py-4 text-base bg-black/40 border-2 border-purple-500/30 rounded-2xl focus:border-purple-500 focus:outline-none text-white placeholder-gray-600 disabled:opacity-50"
                placeholder="100"
                style={{ fontSize: '16px', minHeight: '56px' }}
              />
            </div>
          </div>
          <button
            onClick={() => title && initialAmount && onCreate({ title, sideALabel, sideBLabel, initialSide, initialAmount: parseFloat(initialAmount) })}
            disabled={!title || !initialAmount || loading}
            className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white py-4 rounded-2xl font-bold text-lg disabled:opacity-50 shadow-lg shadow-purple-500/50 active:scale-98 transition-all"
            style={{ minHeight: '56px' }}
          >
            {loading ? 'Creating...' : 'Create Prediction'}
          </button>
        </div>
      </div>
    </div>
  );
};