import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import { Copy, Info, Plus, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { type ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/ui/page-header';
import { Panel, PanelBody, PanelHead } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table } from '@/components/ui/table';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { SelectMenu } from '@/components/ui/select-menu';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { TableSkeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  assignUserRole,
  createUser,
  deleteRole,
  rbacKeys,
  setUserSuspended,
  useRoles,
  useUsers,
  type AdminRole,
  type AdminTeamMember,
} from './queries';

interface RoleOption {
  value: string;
  label: string;
}

const STATUS_BADGE: Record<
  AdminTeamMember['status'],
  { variant: 'success' | 'warning' | 'destructive'; label: string }
> = {
  active: { variant: 'success', label: 'Active' },
  invited: { variant: 'warning', label: 'Invited' },
  suspended: { variant: 'destructive', label: 'Suspended' },
};

function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

function roleBadgeVariant(code: string | undefined): 'accent' | 'primary' {
  return code === 'super_admin' ? 'accent' : 'primary';
}

function lastActiveText(m: AdminTeamMember): string {
  if (m.lastSeenAt) return formatDistanceToNow(new Date(m.lastSeenAt), { addSuffix: true });
  return m.status === 'invited' ? 'Not signed in yet' : '—';
}

// No email invite (admins use Google sign-in) — copy the steps to share out-of-band.
function copyInvite(member: AdminTeamMember) {
  const firstName = member.name.split(/\s+/)[0];
  const message = `Hi ${firstName}, you've been added to the Tavkil admin as ${member.role?.name ?? 'a team member'}. Sign in at https://admin.tavkil.com with "Continue with Google" using ${member.email}.`;
  void navigator.clipboard?.writeText(message);
  toast.success('Sign-in instructions copied');
}

function buildMemberColumns(onManage: (m: AdminTeamMember) => void): ColumnDef<AdminTeamMember>[] {
  return [
    {
      id: 'member',
      accessorFn: (m) => `${m.name} ${m.email}`,
      header: 'Member',
      enableSorting: false,
      cell: ({ row }) => {
        const member = row.original;
        return (
          <div className="flex items-center gap-2.5">
            <span
              className="bg-primary text-primary-foreground grid size-8 flex-none place-items-center rounded-full text-[11px] font-semibold"
              aria-hidden
            >
              {initialsOf(member.name)}
            </span>
            <div className="min-w-0">
              <div className="text-foreground flex items-center gap-1.5 font-semibold">
                {member.name}
                {member.isYou && <Badge variant="secondary">You</Badge>}
              </div>
              <div className="text-muted-foreground truncate text-xs">{member.email}</div>
            </div>
          </div>
        );
      },
    },
    {
      id: 'role',
      accessorFn: (m) => m.role?.name ?? '',
      header: 'Role',
      enableColumnFilter: false,
      cell: ({ row }) =>
        row.original.role ? (
          <Badge variant={roleBadgeVariant(row.original.role.code)}>{row.original.role.name}</Badge>
        ) : (
          <span className="text-muted-foreground text-xs">No role</span>
        ),
    },
    {
      id: 'signIn',
      accessorFn: (m) => (m.googleConnected ? 'Google' : '—'),
      header: 'Sign-in',
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ getValue }) => (
        <span className="text-muted-foreground text-xs">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      enableColumnFilter: false,
      cell: ({ getValue }) => {
        const status = STATUS_BADGE[getValue<AdminTeamMember['status']>()];
        return <Badge variant={status.variant}>{status.label}</Badge>;
      },
    },
    {
      id: 'lastActive',
      accessorFn: lastActiveText,
      header: 'Last active',
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ getValue }) => (
        <span className="text-muted-foreground text-xs">{getValue<string>()}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            disabled={row.original.isYou}
            onClick={() => onManage(row.original)}
          >
            Manage
          </Button>
        </div>
      ),
    },
  ];
}

function RoleRow({
  role,
  onEdit,
  onDelete,
}: {
  role: AdminRole;
  onEdit: (id: string) => void;
  onDelete: (role: AdminRole) => void;
}) {
  const isSystem = role.type === 'system';
  return (
    <tr>
      <td>
        <div className="text-foreground font-semibold">{role.name}</div>
        <div className="text-muted-foreground text-xs">{role.description ?? '—'}</div>
      </td>
      <td>
        <Badge variant={isSystem ? 'secondary' : 'primary'}>{isSystem ? 'System' : 'Custom'}</Badge>
      </td>
      <td className="text-muted-foreground">{role.memberCount}</td>
      <td className="text-muted-foreground">{role.permissions.length}</td>
      <td>
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => onEdit(role.id)}>
            {isSystem ? 'View' : 'Edit'}
          </Button>
          <ConfirmDialog
            trigger={
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled={isSystem || role.memberCount > 0}
              >
                Delete
              </Button>
            }
            title={`Delete ${role.name}?`}
            description="This removes the role. Members must be reassigned first."
            confirmLabel="Delete role"
            destructive
            onConfirm={() => onDelete(role)}
          />
        </div>
      </td>
    </tr>
  );
}

const TABS = [
  { id: 'users', label: 'Users', to: '/users' },
  { id: 'roles', label: 'Roles', to: '/users/roles' },
];

export function UsersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { tab } = useParams<{ tab: string }>();
  const active = tab === 'roles' ? 'roles' : 'users';

  const { data: members = [], isLoading } = useUsers();
  const { data: roles = [] } = useRoles();
  const [inviting, setInviting] = useState(false);
  const [managing, setManaging] = useState<AdminTeamMember | null>(null);

  const columns = useMemo(() => buildMemberColumns(setManaging), []);
  const roleOptions = useMemo<RoleOption[]>(
    () => roles.map((r) => ({ value: r.id, label: r.name })),
    [roles],
  );

  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: rbacKeys.users });

  const removeRole = useMutation({
    mutationFn: (role: AdminRole) => deleteRole(role.id),
    onSuccess: (_res, role) => {
      void queryClient.invalidateQueries({ queryKey: rbacKeys.roles });
      toast.warning('Role deleted', { description: `${role.name} removed.` });
    },
    onError: () => toast.error('Could not delete the role.'),
  });

  return (
    <div>
      <PageHeader
        title="User management"
        subtitle="Admin team members and what each one can do"
        actions={
          active === 'users' ? (
            <Button onClick={() => setInviting(true)}>
              <UserPlus className="size-4" />
              Add member
            </Button>
          ) : (
            <Button onClick={() => navigate('/users/roles/new')}>
              <Plus className="size-4" />
              New role
            </Button>
          )
        }
      />

      <div
        role="tablist"
        aria-label="User management sections"
        className="border-border mb-6 flex gap-0 border-b"
      >
        {TABS.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => navigate(t.to)}
              className={cn(
                '-mb-px border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors',
                isActive
                  ? 'border-primary text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground border-transparent',
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {active === 'users' ? (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-foreground text-[15px] font-semibold">Members</h2>
            <span className="text-muted-foreground text-xs">
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </span>
          </div>
          {isLoading && members.length === 0 ? (
            <Panel>
              <PanelBody tight>
                <TableSkeleton
                  rows={6}
                  columns={[
                    { header: 'Member', cell: 'avatar' },
                    { header: 'Role', cell: 'badge' },
                    { header: 'Sign-in', cell: 'text' },
                    { header: 'Status', cell: 'badge' },
                    { header: 'Last active', cell: 'text' },
                    { header: '', cell: 'actions' },
                  ]}
                />
              </PanelBody>
            </Panel>
          ) : (
            <DataTable columns={columns} data={members} />
          )}
        </div>
      ) : (
        <Panel>
          <PanelHead title="Roles" />
          <PanelBody tight>
            <Table>
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Type</th>
                  <th>Members</th>
                  <th>Permissions</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <RoleRow
                    key={role.id}
                    role={role}
                    onEdit={(id) => navigate(`/users/roles/${id}`)}
                    onDelete={(r) => removeRole.mutate(r)}
                  />
                ))}
              </tbody>
            </Table>
          </PanelBody>
          <div className="border-border text-muted-foreground flex items-center gap-2 border-t px-[18px] py-3 text-xs">
            <Info className="size-3.5 flex-none" />
            <span>System roles can be viewed but not edited or deleted.</span>
          </div>
        </Panel>
      )}

      <Dialog open={inviting} onOpenChange={(open) => !open && setInviting(false)}>
        {inviting && (
          <AddMemberForm
            roleOptions={roleOptions}
            onCancel={() => setInviting(false)}
            onDone={() => {
              setInviting(false);
              void invalidateUsers();
            }}
          />
        )}
      </Dialog>

      <Sheet open={!!managing} onOpenChange={(open) => !open && setManaging(null)}>
        {managing && (
          <ManageMemberPanel
            key={managing.id}
            member={managing}
            roleOptions={roleOptions}
            onClose={() => setManaging(null)}
            onChanged={(m) => {
              setManaging(m);
              void invalidateUsers();
            }}
          />
        )}
      </Sheet>
    </div>
  );
}

function AddMemberForm({
  roleOptions,
  onCancel,
  onDone,
}: {
  roleOptions: RoleOption[];
  onCancel: () => void;
  onDone: () => void;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState(roleOptions[0]?.value ?? '');
  const [errors, setErrors] = useState<FieldErrors>({});

  const create = useMutation({
    mutationFn: () =>
      createUser({
        email: email.trim().toLowerCase(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        roleId,
      }),
    onSuccess: (m) => {
      toast.success('Member added', { description: `${m.name} can now sign in with Google.` });
      onDone();
    },
    onError: (e) => {
      const code = (e as { code?: string } | null)?.code;
      if (code === 'resource.conflict') {
        setErrors((prev) => ({ ...prev, email: 'A user with this email already exists.' }));
        return;
      }
      toast.error('Could not add the member.');
    },
  });

  // Clears a field's error as the user fixes it (after the first submit attempt).
  const clear = (key: keyof FieldErrors) => setErrors((prev) => ({ ...prev, [key]: undefined }));

  const submit = () => {
    const next = validateMember({ firstName, lastName, email, roleId });
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    create.mutate();
  };

  return (
    <DialogContent>
      <DialogTitle>Add team member</DialogTitle>
      <DialogDescription>
        They’ll sign in with Google using this email — no invite email is sent.
      </DialogDescription>

      <div className="mt-4 flex flex-col gap-3.5">
        <div className="grid grid-cols-2 gap-3.5">
          <Field className="mb-0">
            <FieldLabel htmlFor="m-first" required>
              First name
            </FieldLabel>
            <Input
              id="m-first"
              value={firstName}
              maxLength={30}
              aria-invalid={!!errors.firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                clear('firstName');
              }}
            />
            {errors.firstName && <FieldError>{errors.firstName}</FieldError>}
          </Field>
          <Field className="mb-0">
            <FieldLabel htmlFor="m-last" required>
              Last name
            </FieldLabel>
            <Input
              id="m-last"
              value={lastName}
              maxLength={30}
              aria-invalid={!!errors.lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                clear('lastName');
              }}
            />
            {errors.lastName && <FieldError>{errors.lastName}</FieldError>}
          </Field>
        </div>
        <Field className="mb-0">
          <FieldLabel htmlFor="m-email" required>
            Email
          </FieldLabel>
          <Input
            id="m-email"
            type="email"
            value={email}
            maxLength={254}
            aria-invalid={!!errors.email}
            onChange={(e) => {
              setEmail(e.target.value);
              clear('email');
            }}
          />
          {errors.email && <FieldError>{errors.email}</FieldError>}
        </Field>
        <Field className="mb-0">
          <FieldLabel htmlFor="m-role" required>
            Role
          </FieldLabel>
          <SelectMenu
            id="m-role"
            value={roleId}
            onValueChange={(v) => {
              setRoleId(v);
              clear('role');
            }}
            options={roleOptions}
          />
          {errors.role && <FieldError>{errors.role}</FieldError>}
        </Field>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={create.isPending}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={create.isPending}>
          Add member
        </Button>
      </div>
    </DialogContent>
  );
}

interface FieldErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
}

// Mirrors the backend rules (1–30 chars, no markup, valid email) so the user sees
// per-field errors before the request, not a generic toast.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NO_MARKUP = /[<>{}[\]\\]/;

function validateMember(v: {
  firstName: string;
  lastName: string;
  email: string;
  roleId: string;
}): FieldErrors {
  const errors: FieldErrors = {};
  const name = (value: string): string | undefined => {
    const t = value.trim();
    if (!t) return 'Required';
    if (t.length > 30) return 'Keep it under 30 characters';
    if (NO_MARKUP.test(t)) return 'Remove special characters';
    return undefined;
  };
  errors.firstName = name(v.firstName);
  errors.lastName = name(v.lastName);

  const email = v.email.trim();
  if (!email) errors.email = 'Required';
  else if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email';

  if (!v.roleId) errors.role = 'Select a role';
  return errors;
}

function ManageMemberPanel({
  member,
  roleOptions,
  onClose,
  onChanged,
}: {
  member: AdminTeamMember;
  roleOptions: RoleOption[];
  onClose: () => void;
  onChanged: (m: AdminTeamMember) => void;
}) {
  const suspended = member.status === 'suspended';

  const assign = useMutation({
    mutationFn: (roleId: string) => assignUserRole(member.id, roleId),
    onSuccess: (m) => {
      onChanged(m);
      toast.success('Role updated');
    },
    onError: () => toast.error('Could not update the role.'),
  });

  const suspend = useMutation({
    mutationFn: () => setUserSuspended(member.id, !suspended),
    onSuccess: (m) => {
      onChanged(m);
      if (suspended) toast.success('Member reactivated');
      else toast.warning('Member suspended');
    },
    onError: () => toast.error('Could not update the member.'),
  });

  const busy = assign.isPending || suspend.isPending;

  return (
    <SheetContent>
      <div className="border-border flex items-center justify-between border-b px-5 py-4">
        <SheetTitle>Manage member</SheetTitle>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto px-5 py-4">
        <div className="mb-5 flex items-center gap-3">
          <span
            className="bg-primary text-primary-foreground grid size-11 flex-none place-items-center rounded-full text-sm font-semibold"
            aria-hidden
          >
            {initialsOf(member.name)}
          </span>
          <div className="min-w-0">
            <div className="text-foreground font-semibold">{member.name}</div>
            <div className="text-muted-foreground truncate text-xs">{member.email}</div>
          </div>
        </div>

        <Field>
          <FieldLabel htmlFor="mng-role">Role</FieldLabel>
          <SelectMenu
            id="mng-role"
            value={member.role?.id ?? ''}
            disabled={busy}
            onValueChange={(roleId) => assign.mutate(roleId)}
            options={roleOptions}
          />
        </Field>

        <div className="mb-4">
          <div className="text-muted-foreground mb-1.5 text-xs font-medium">Status</div>
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_BADGE[member.status].variant}>
              {STATUS_BADGE[member.status].label}
            </Badge>
            {member.status === 'invited' && (
              <Button variant="outline" size="sm" onClick={() => copyInvite(member)}>
                <Copy className="size-3.5" /> Copy sign-in steps
              </Button>
            )}
          </div>
        </div>

        <div>
          <div className="text-muted-foreground mb-1 text-xs font-medium">Last active</div>
          <div className="text-sm">{lastActiveText(member)}</div>
        </div>
      </div>

      <div className="border-border flex items-center justify-end border-t px-5 py-4">
        <Button
          variant={suspended ? 'outline' : 'destructive'}
          disabled={busy}
          onClick={() => suspend.mutate()}
        >
          {suspended ? 'Reactivate' : 'Suspend'}
        </Button>
      </div>
    </SheetContent>
  );
}
