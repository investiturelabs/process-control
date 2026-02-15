import { useState } from 'react';
import { useAppStore } from '@/context';
import { toast } from 'sonner';
import {
  UserPlus,
  Shield,
  User as UserIcon,
  Mail,
  Clock,
  Trash2,
} from 'lucide-react';
import type { Role } from '@/types';
import { track } from '@/lib/analytics';
import { captureException } from '@/lib/errorTracking';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

function formatTimeRemaining(expiresAt?: string): string | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `Expires in ${days} day${days !== 1 ? 's' : ''}`;
  return `Expires in ${hours} hour${hours !== 1 ? 's' : ''}`;
}

export function TeamPage() {
  const {
    currentUser,
    users,
    invitations,
    inviteUser,
    updateUserRole,
    removeInvitation,
    setUserActive,
  } = useAppStore();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('user');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'admin';

  // Fix #17 + #35: Await inviteUser with duplicate check
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;

    // Fix #35: Check for duplicates
    if (users.some(u => u.email === email)) {
      setInviteError('This email is already a team member.');
      return;
    }
    if (invitations.some(i => i.email === email)) {
      setInviteError('An invitation is already pending for this email.');
      return;
    }

    setInviteError(null);
    setIsInviting(true);
    try {
      await inviteUser(email, inviteRole);
      track({ name: 'user_invited', properties: { role: inviteRole } });
      setInviteEmail('');
      setInviteRole('user');
    } catch (err) {
      captureException(err);
      const msg = err instanceof Error ? err.message : 'Failed to send invitation.';
      toast.error(msg);
    } finally {
      setIsInviting(false);
    }
  };

  // Fix #33/#49: Validate role before calling updateUserRole
  const handleRoleChange = async (userId: string, value: string) => {
    if (value !== 'admin' && value !== 'user') return;
    try {
      await updateUserRole(userId, value);
    } catch (err) {
      captureException(err);
      toast.error('Failed to update role.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Team</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {users.length} member{users.length !== 1 ? 's' : ''}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowInviteForm(!showInviteForm)} className="gap-1.5">
            <UserPlus size={14} />
            Invite
          </Button>
        )}
      </div>

      {/* Invite form */}
      {showInviteForm && isAdmin && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">
              Invite a team member
            </h3>
            <form onSubmit={handleInvite} className="flex gap-3">
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => { setInviteEmail(e.target.value); setInviteError(null); }}
                placeholder="email@company.com"
                className="flex-1"
                required
              />
              <Select value={inviteRole} onValueChange={(v) => { if (v === 'admin' || v === 'user') setInviteRole(v); }}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" disabled={isInviting}>
                {isInviting ? 'Sending...' : 'Send'}
              </Button>
            </form>
            {inviteError && (
              <p className="text-sm text-red-600 mt-2" role="alert">{inviteError}</p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              They can sign in with this email to join your team.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Current members */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-2">Members</h2>
        <Card className="divide-y divide-border">
          {users.map((user) => {
            const isInactive = user.active === false;
            return (
            <div
              key={user.id}
              className={`flex items-center justify-between px-4 py-3${isInactive ? ' opacity-50' : ''}`}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback
                    style={{ backgroundColor: user.avatarColor }}
                    className="text-white text-sm font-semibold"
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{user.name}</p>
                    {user.id === currentUser?.id && (
                      <Badge variant="secondary" className="text-xs">You</Badge>
                    )}
                    {isInactive && (
                      <Badge variant="secondary" className="text-xs text-amber-700 bg-amber-50">Inactive</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isAdmin && user.id !== currentUser?.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    disabled={deactivatingId === user.id}
                    onClick={async () => {
                      setDeactivatingId(user.id);
                      try {
                        await setUserActive(user.id, isInactive);
                        if (!isInactive) track({ name: 'user_deactivated', properties: {} });
                        toast.success(isInactive ? `Reactivated ${user.name}` : `Deactivated ${user.name}`);
                      } catch (err) {
                        captureException(err);
                        const msg = err instanceof Error ? err.message : '';
                        toast.error(msg.includes('last admin') ? 'Cannot deactivate the last admin.' : 'Failed to update user status.');
                      } finally {
                        setDeactivatingId(null);
                      }
                    }}
                  >
                    {deactivatingId === user.id ? '...' : isInactive ? 'Reactivate' : 'Deactivate'}
                  </Button>
                )}
                {isAdmin && user.id !== currentUser?.id ? (
                  <Select
                    value={user.role}
                    onValueChange={(v) => handleRoleChange(user.id, v)}
                  >
                    <SelectTrigger className="w-[90px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge
                    variant={user.role === 'admin' ? 'default' : 'secondary'}
                    className="gap-1"
                  >
                    {user.role === 'admin' ? (
                      <Shield size={12} />
                    ) : (
                      <UserIcon size={12} />
                    )}
                    {user.role === 'admin' ? 'Admin' : 'User'}
                  </Badge>
                )}
              </div>
            </div>
            );
          })}
        </Card>
      </div>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">
            Pending invitations
          </h2>
          <Card className="divide-y divide-border">
            {invitations.map((inv) => {
              const timeRemaining = formatTimeRemaining(inv.expiresAt);
              const isExpiringSoon = inv.expiresAt
                ? new Date(inv.expiresAt).getTime() - Date.now() < 2 * 24 * 60 * 60 * 1000
                : false;
              return (
              <div
                key={inv.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-secondary">
                      <Mail size={16} className="text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{inv.email}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock size={10} />
                      Invited{' '}
                      {new Date(inv.createdAt).toLocaleDateString()}
                      <span className="capitalize">&middot; {inv.role}</span>
                      {timeRemaining && (
                        <span className={isExpiringSoon ? 'text-amber-600 font-medium' : ''}>
                          &middot; {timeRemaining}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-600"
                    aria-label={`Remove invitation for ${inv.email}`}
                    onClick={async () => {
                      if (!window.confirm(`Remove invitation for ${inv.email}?`)) return;
                      try {
                        await removeInvitation(inv.id);
                      } catch (err) {
                        captureException(err);
                        toast.error('Failed to remove invitation.');
                      }
                    }}
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
              );
            })}
          </Card>
        </div>
      )}
    </div>
  );
}
