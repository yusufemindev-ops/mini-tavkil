import { type FormEvent, useState } from 'react';
import { Pencil } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import { Panel, PanelBody, PanelHead } from '@/components/ui/panel';
import { Field, FieldHelp, FieldLabel, FormRow } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { authClient } from '@/lib/auth-client';
import { SESSION_QUERY_KEY, useSession } from '@/features/auth/use-session';

export function ProfilePage() {
  const { data: admin } = useSession();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(admin?.fullName ?? '');

  // Persists the display name via Better Auth's built-in `name` field, then
  // refreshes the session so the topbar/profile reflect it immediately.
  const save = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await authClient.updateUser({ name });
      if (error) throw new Error(error.message ?? 'Update failed');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
      toast.success('Profile updated');
      setEditing(false);
    },
    onError: () => toast.error('Could not update your profile.'),
  });

  const startEdit = () => {
    setFullName(admin?.fullName ?? '');
    setEditing(true);
  };

  const cancelEdit = () => {
    setFullName(admin?.fullName ?? '');
    setEditing(false);
  };

  const saveProfile = (e: FormEvent) => {
    e.preventDefault();
    const name = fullName.trim();
    if (!name) {
      toast.error('Full name cannot be empty.');
      return;
    }
    save.mutate(name);
  };

  const roles = admin?.roles ?? [];
  const nameUnchanged = fullName.trim() === (admin?.fullName ?? '');

  return (
    <div className="mx-auto max-w-[760px]">
      <PageHeader title="My profile" subtitle="Your account details, security, and access." />

      <div className="flex flex-col gap-6">
        {/* Personal information */}
        <Panel>
          <PanelHead title="Personal information" />
          <PanelBody>
            <form onSubmit={saveProfile}>
              <FormRow>
                <Field>
                  <FieldLabel>Full name</FieldLabel>
                  {editing ? (
                    <Input
                      autoFocus
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  ) : (
                    <div className="flex h-10 items-center text-sm">{admin?.fullName || '—'}</div>
                  )}
                </Field>
                <Field>
                  <FieldLabel>Email</FieldLabel>
                  <Input value={admin?.email ?? ''} disabled />
                  <FieldHelp>Comes from your Google account — can’t be changed here.</FieldHelp>
                </Field>
              </FormRow>
              <div className="mt-1 flex justify-end gap-2">
                {editing ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={cancelEdit}
                      disabled={save.isPending}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={save.isPending || nameUnchanged}>
                      {save.isPending ? 'Saving…' : 'Save changes'}
                    </Button>
                  </>
                ) : (
                  <Button type="button" variant="outline" onClick={startEdit}>
                    <Pencil className="size-4" />
                    Edit
                  </Button>
                )}
              </div>
            </form>
          </PanelBody>
        </Panel>

        {/* Sign-in & security — admins authenticate with Google; there's no
            password or 2FA to manage in-app (handled by the Google account). */}
        <Panel>
          <PanelHead title="Sign-in & security" />
          <PanelBody>
            <p className="text-muted-foreground text-sm">
              You sign in with <strong className="text-foreground">Google</strong> (
              <span className="text-foreground">{admin?.email}</span>). Your password and two-factor
              authentication are managed in your Google account — there’s nothing to set here.
            </p>
          </PanelBody>
        </Panel>

        {/* Role & access (read-only) */}
        <Panel>
          <PanelHead title="Role & access" />
          <PanelBody>
            {roles.length > 0 ? (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {roles.map((role) => (
                  <Badge key={role}>{role}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-foreground mb-3 text-sm font-medium">No role assigned.</p>
            )}
            <p className="text-muted-foreground text-sm">
              Roles and their permissions are managed under{' '}
              <span className="text-foreground font-medium">Users &amp; roles</span>.
            </p>
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}
