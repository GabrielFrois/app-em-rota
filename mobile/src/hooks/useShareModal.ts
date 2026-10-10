import { useState, useRef } from 'react';
import { authService, itineraryService } from '../services/api';
import { UserPreview } from '../types';

interface ShareMember {
  userId: string; name: string; username: string; permission: 'view' | 'edit';
}

export function useShareModal(itineraryId: string, currentUserId?: string) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareMembers, setShareMembers]     = useState<ShareMember[]>([]);
  const [searchQuery, setSearchQuery]       = useState('');
  const [searchResults, setSearchResults]   = useState<UserPreview[]>([]);
  const [searchLoading, setSearchLoading]   = useState(false);
  const [selectedUser, setSelectedUser]     = useState<UserPreview | null>(null);
  const [selectedPerm, setSelectedPerm]     = useState<'view' | 'edit'>('view');
  const [shareLoading, setShareLoading]     = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openShareModal = (initialMembers: ShareMember[]) => {
    setShareMembers(initialMembers);
    setSearchQuery(''); setSearchResults([]); setSelectedUser(null); setSelectedPerm('view');
    setShowShareModal(true);
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text); setSelectedUser(null);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (text.trim().length < 2) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const { users } = await authService.searchUsers(text.trim());
        const alreadyIn = new Set(shareMembers.map(m => m.userId));
        setSearchResults(users.filter((u: UserPreview) => u.id !== currentUserId && !alreadyIn.has(u.id)));
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 400);
  };

  const handleShare = async (showError: (msg: string) => void, showSuccess: (msg: string) => void) => {
    if (!selectedUser) return;
    setShareLoading(true);
    try {
      await itineraryService.share(itineraryId, selectedUser.id, selectedPerm);
      setShareMembers(prev => [...prev, {
        userId: selectedUser.id, name: selectedUser.name,
        username: selectedUser.username, permission: selectedPerm,
      }]);
      setSelectedUser(null); setSearchQuery(''); setSearchResults([]);
      showSuccess(`${selectedUser.name} agora tem acesso ao roteiro.`);
    } catch (err: any) {
      showError(err.message ?? 'Não foi possível compartilhar');
    } finally {
      setShareLoading(false);
    }
  };

  const doRemoveShare = async (member: ShareMember, showError: (msg: string) => void) => {
    try {
      await itineraryService.removeShare(itineraryId, member.userId);
      setShareMembers(prev => prev.filter(m => m.userId !== member.userId));
    } catch (err: any) {
      showError(err.message);
    }
  };

  return {
    showShareModal, setShowShareModal, shareMembers, setShareMembers,
    searchQuery, searchResults, searchLoading,
    selectedUser, setSelectedUser, selectedPerm, setSelectedPerm, shareLoading,
    openShareModal, handleSearchChange, handleShare, doRemoveShare,
  };
}