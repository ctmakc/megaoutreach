import { useState } from 'react';
import { Plus, Mail, Trash2, Crown, Shield, User, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

interface TeamMember {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'owner' | 'admin' | 'manager' | 'member';
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

const roleLabels = {
  owner: { label: 'Owner', icon: Crown, color: 'text-yellow-600' },
  admin: { label: 'Admin', icon: Shield, color: 'text-purple-600' },
  manager: { label: 'Manager', icon: User, color: 'text-blue-600' },
  member: { label: 'Member', icon: User, color: 'text-gray-600' },
};

export default function TeamPage() {
  const { user } = useAuth();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'manager' | 'member'>('member');
  const queryClient = useQueryClient();

  // Fetch team members
  const { data: teamMembers, isLoading } = useQuery<TeamMember[]>({
    queryKey: ['team-members'],
    queryFn: () => api.get('/organizations/team').then(res => res.data),
  });

  // Invite member
  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      api.post('/organizations/team/invite', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success('Invitation sent');
      setShowInvite(false);
      setInviteEmail('');
    },
    onError: () => toast.error('Failed to send invitation'),
  });

  // Remove member
  const removeMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/organizations/team/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success('Team member removed');
    },
    onError: () => toast.error('Failed to remove team member'),
  });

  // Update role
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.patch(`/organizations/team/${userId}`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success('Role updated');
    },
    onError: () => toast.error('Failed to update role'),
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    inviteMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  const canManageTeam = user?.role === 'owner' || user?.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Team Members
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Manage who has access to your workspace
            </p>
          </div>
          {canManageTeam && (
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
            >
              <Plus className="h-5 w-5" />
              Invite Member
            </button>
          )}
        </div>

        {/* Invite Form */}
        {showInvite && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
              Invite Team Member
            </h3>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="colleague@company.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="member">Member - Can view and send messages</option>
                  <option value="manager">Manager - Can manage campaigns and contacts</option>
                  <option value="admin">Admin - Can manage team and settings</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={inviteMutation.isPending}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        )}

        {/* Team Members List */}
        <div className="space-y-4">
          {teamMembers?.map((member) => {
            const roleInfo = roleLabels[member.role];
            const RoleIcon = roleInfo.icon;
            const isCurrentUser = member.id === user?.id;
            const canEdit = canManageTeam && !isCurrentUser && member.role !== 'owner';

            return (
              <div
                key={member.id}
                className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
                      <span className="text-lg font-semibold text-primary-600 dark:text-primary-400">
                        {member.firstName?.[0] || member.email[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {member.firstName} {member.lastName}
                        {isCurrentUser && (
                          <span className="ml-2 text-sm text-gray-500">(You)</span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {member.email}
                      </p>
                      {member.lastLoginAt && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          Last active {new Date(member.lastLoginAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {canEdit ? (
                      <select
                        value={member.role}
                        onChange={(e) => {
                          if (confirm('Are you sure you want to change this member\'s role?')) {
                            updateRoleMutation.mutate({
                              userId: member.id,
                              role: e.target.value,
                            });
                          }
                        }}
                        className="rounded-lg border border-gray-300 px-3 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="member">Member</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <div className={`flex items-center gap-2 ${roleInfo.color}`}>
                        <RoleIcon className="h-5 w-5" />
                        <span className="font-medium">{roleInfo.label}</span>
                      </div>
                    )}

                    {canEdit && (
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to remove this team member?')) {
                            removeMutation.mutate(member.id);
                          }
                        }}
                        className="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-700"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!isLoading && teamMembers?.length === 0 && (
          <div className="py-12 text-center">
            <User className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              No team members
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Invite your first team member to get started.
            </p>
          </div>
        )}

        {/* Roles Info */}
        <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 font-medium text-gray-900 dark:text-white">
            Role Permissions
          </h3>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-start gap-3">
              <Crown className="mt-0.5 h-5 w-5 text-yellow-600" />
              <div>
                <strong className="text-gray-900 dark:text-white">Owner</strong> - Full access to everything including billing
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-5 w-5 text-purple-600" />
              <div>
                <strong className="text-gray-900 dark:text-white">Admin</strong> - Can manage team, settings, and all outreach
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User className="mt-0.5 h-5 w-5 text-blue-600" />
              <div>
                <strong className="text-gray-900 dark:text-white">Manager</strong> - Can manage campaigns, contacts, and templates
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User className="mt-0.5 h-5 w-5 text-gray-600" />
              <div>
                <strong className="text-gray-900 dark:text-white">Member</strong> - Can view and send messages
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
