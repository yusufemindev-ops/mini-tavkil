import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Field, FieldError, FieldHelp, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SheetContent, SheetTitle } from '@/components/ui/sheet';
import {
  domainCodes,
  grantWithDeps,
  groupState,
  lockedCodes,
  toggleAction,
  toggleDomain,
} from './permissions';
import {
  createRole,
  deleteRole,
  updateRole,
  usePermissionCatalog,
  type AdminRole,
  type PermissionCatalogDomain,
} from './queries';

const DOMAIN_LABELS: Record<string, string> = {
  products: 'Products',
  categories: 'Categories',
  suppliers: 'Suppliers',
  media: 'Media',
  buyers: 'Buyers',
  account_requests: 'Account requests',
  orders: 'Orders (RFQ Inbox)',
  users: 'Team & RBAC',
  settings: 'Settings',
  currencies: 'Currencies & FX',
  audit_log: 'Audit log',
};

const NO_MARKUP_RE = /[<>{}[\]\\]/;

interface RoleFieldErrors {
  name?: string;
  description?: string;
  permissions?: string;
}

export function RoleEditorSheet({
  role,
  onClose,
  onSaved,
}: {
  role: AdminRole | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = role === null;
  const isSystem = role?.type === 'system';
  const { data: catalog = [] } = usePermissionCatalog();

  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [selected, setSelected] = useState<Set<string>>(() => new Set(role?.permissions ?? []));
  const [errors, setErrors] = useState<RoleFieldErrors>({});

  const allCodes = useMemo(
    () => new Set(catalog.flatMap((group) => domainCodes(group))),
    [catalog],
  );
  const locked = useMemo(() => lockedCodes(selected, allCodes), [selected, allCodes]);

  const handleTogglePermission = (code: string) => {
    if (isSystem || locked.has(code)) return;
    setSelected((prev) =>
      prev.has(code) ? toggleAction(prev, code, false) : grantWithDeps(prev, code, allCodes),
    );
    setErrors((prev) => ({ ...prev, permissions: undefined }));
  };

  const handleToggleDomain = (group: PermissionCatalogDomain) => {
    if (isSystem) return;
    const state = groupState(group, selected);
    setSelected((prev) => toggleDomain(prev, group, state !== 'all'));
    setErrors((prev) => ({ ...prev, permissions: undefined }));
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        permissions: [...selected],
      };
      return isNew ? createRole(payload) : updateRole(role.id, payload);
    },
    onSuccess: (saved) => {
      toast.success(isNew ? 'Custom role created' : 'Role updated', {
        description: `${saved.name} (${saved.permissions.length} permissions)`,
      });
      onSaved();
    },
    onError: (err) => {
      const code = (err as { code?: string } | null)?.code;
      if (code === 'resource.conflict') {
        setErrors((prev) => ({ ...prev, name: 'A role with this name already exists.' }));
        return;
      }
      toast.error(err instanceof Error ? err.message : 'Could not save the role.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteRole(role!.id),
    onSuccess: () => {
      toast.success('Role deleted');
      onSaved();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Could not delete the role.');
    },
  });

  const handleSave = () => {
    const nextErrors: RoleFieldErrors = {};
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      nextErrors.name = 'Enter a role name (at least 2 characters)';
    } else if (trimmedName.length > 60) {
      nextErrors.name = 'Keep it under 60 characters';
    } else if (NO_MARKUP_RE.test(trimmedName)) {
      nextErrors.name = 'Remove special characters';
    }
    if (description.trim().length > 240) {
      nextErrors.description = 'Keep description under 240 characters';
    }
    if (selected.size === 0) {
      nextErrors.permissions = 'Select at least one permission';
    }
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    saveMutation.mutate();
  };

  const busy = saveMutation.isPending || deleteMutation.isPending;

  return (
    <SheetContent className="w-[min(520px,calc(100vw-2rem))]">
      <div className="border-border flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <SheetTitle>
            {isNew ? 'Create custom role' : isSystem ? role.name : `Edit role: ${role.name}`}
          </SheetTitle>
          {role && (
            <Badge variant={isSystem ? 'secondary' : 'primary'}>
              {isSystem ? 'System' : 'Custom'}
            </Badge>
          )}
        </div>
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
        <Field>
          <FieldLabel htmlFor="role-name" required={!isSystem}>
            Role name
          </FieldLabel>
          <Input
            id="role-name"
            value={name}
            maxLength={60}
            disabled={isSystem || busy}
            placeholder="e.g. Order Coordinator"
            aria-invalid={!!errors.name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((prev) => ({ ...prev, name: undefined }));
            }}
          />
          {errors.name && <FieldError>{errors.name}</FieldError>}
        </Field>

        <Field>
          <FieldLabel htmlFor="role-description">Description</FieldLabel>
          <Input
            id="role-description"
            value={description}
            maxLength={240}
            disabled={isSystem || busy}
            placeholder="Short summary of what members with this role can do"
            aria-invalid={!!errors.description}
            onChange={(e) => {
              setDescription(e.target.value);
              setErrors((prev) => ({ ...prev, description: undefined }));
            }}
          />
          {errors.description && <FieldError>{errors.description}</FieldError>}
          {isSystem && (
            <FieldHelp>System roles are fixed in code and cannot be modified or deleted.</FieldHelp>
          )}
        </Field>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-foreground text-xs font-semibold">
              Permissions ({selected.size} selected)
            </span>
            {errors.permissions && (
              <span className="text-destructive text-xs font-medium">{errors.permissions}</span>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {catalog.map((group) => {
              const allChecked = groupState(group, selected) === 'all';
              return (
                <div key={group.domain} className="border-border rounded-lg border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-foreground text-xs font-semibold">
                      {DOMAIN_LABELS[group.domain] ?? group.domain}
                    </span>
                    {!isSystem && (
                      <button
                        type="button"
                        onClick={() => handleToggleDomain(group)}
                        className="text-primary text-[11px] font-medium hover:underline"
                      >
                        {allChecked ? 'Clear' : 'Select all'}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {group.actions.map((perm) => {
                      const checked = selected.has(perm.code);
                      const isLocked = locked.has(perm.code);
                      return (
                        <label
                          key={perm.code}
                          className="hover:bg-muted/50 flex cursor-pointer items-start gap-2 rounded px-1.5 py-1 text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={isSystem || busy || isLocked}
                            onChange={() => handleTogglePermission(perm.code)}
                            className="mt-0.5 rounded"
                          />
                          <span className="min-w-0">
                            <span className="text-foreground block font-medium">{perm.name}</span>
                            <span className="text-muted-foreground block font-mono text-[10px]">
                              {perm.code}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="border-border flex items-center justify-between border-t px-5 py-4">
        <div>
          {!isNew && !isSystem && (
            <ConfirmDialog
              trigger={
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={busy || (role?.memberCount ?? 0) > 0}
                  title={
                    (role?.memberCount ?? 0) > 0
                      ? 'Reassign members before deleting this role'
                      : undefined
                  }
                >
                  <Trash2 className="size-3.5" />
                  Delete role
                </Button>
              }
              title={`Delete "${role.name}"?`}
              description="This permanently removes the custom role and its permission grants."
              confirmLabel="Delete role"
              destructive
              onConfirm={() => deleteMutation.mutate()}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            {isSystem ? 'Close' : 'Cancel'}
          </Button>
          {!isSystem && (
            <Button onClick={handleSave} disabled={busy}>
              {isNew ? 'Create role' : 'Save role'}
            </Button>
          )}
        </div>
      </div>
    </SheetContent>
  );
}
