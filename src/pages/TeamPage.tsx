import { useState } from 'react';
import { useAppStore } from '@/context';
import {
  UserPlus,
  Shield,
  User as UserIcon,
  Mail,
  Clock,
  Trash2,
} from 'lucide-react';
import type { Role } from '@/types';
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

export function TeamPage() {
  const {
    currentUser,
    users,
    invitations,
    inviteUser,
    updateUserRole,
    removeInvitation,
  } = useAppStore();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('user');
  const [showInviteForm, setShowInviteForm] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    inviteUser(inviteEmail.trim().toLowerCase(), inviteRole);
    setInviteEmail('');
    setShowInviteForm(false);
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
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@company.com"
                className="flex-1"
                required
              />
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit">Send</Button>
            </form>
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
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between px-4 py-3"
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
                  </div>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isAdmin && user.id !== currentUser?.id ? (
                  <Select
                    value={user.role}
                    onValueChange={(v) => updateUserRole(user.id, v as Role)}
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
          ))}
        </Card>
      </div>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">
            Pending invitations
          </h2>
          <Card className="divide-y divide-border">
            {invitations.map((inv) => (
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
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeInvitation(inv.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
