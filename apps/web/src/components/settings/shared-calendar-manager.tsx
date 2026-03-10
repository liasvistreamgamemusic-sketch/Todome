'use client';

import { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import {
  Plus,
  Trash2,
  X,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Link,
  Crown,
  Users,
  LogOut,
  UserMinus,
  Pencil,
} from 'lucide-react';
import { Button } from '@todome/ui';
import { useTranslation } from '@todome/store';
import type { SharedCalendar, SharedCalendarMember } from '@todome/db';
import {
  useSharedCalendars,
  useCreateSharedCalendar,
  useUpdateSharedCalendar,
  useDeleteSharedCalendar,
  useSharedCalendarMembers,
  useCreateInvite,
  useRemoveSharedCalendarMember,
  useToggleMemberVisibility,
  useUserId,
} from '@/hooks/queries';

const PRESET_COLORS: string[] = [
  '#4285F4', '#EA4335', '#FBBC04', '#34A853',
  '#FF6D01', '#46BDC6', '#7986CB', '#E67C73',
];

const DEFAULT_COLOR = '#4285F4';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

type MemberListProps = {
  calendarId: string;
  isOwner: boolean;
};

const MemberList = ({ calendarId, isOwner }: MemberListProps) => {
  const { t } = useTranslation();
  const { data: members = [] } = useSharedCalendarMembers(calendarId);
  const removeMember = useRemoveSharedCalendarMember();

  const activeMembers = members.filter((m) => m.status === 'active');

  if (activeMembers.length === 0) {
    return (
      <p className="text-xs text-text-tertiary">{t('sharedCal.noMembers')}</p>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-text-secondary">
        {t('sharedCal.members')} ({activeMembers.length})
      </p>
      {activeMembers.map((member) => (
        <div
          key={member.id}
          className="flex items-center justify-between rounded-md bg-bg-secondary px-3 py-2"
        >
          <span className="text-xs text-text-primary truncate">
            {member.user_id ?? t('sharedCal.unknown')}
          </span>
          {isOwner && (
            <button
              type="button"
              onClick={() => removeMember.mutate(member.id)}
              className="rounded-md p-1 text-text-tertiary hover:text-[#D32F2F] hover:bg-bg-primary transition-colors"
              title={t('sharedCal.removeMember')}
            >
              <UserMinus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

type InviteLinkButtonProps = {
  calendarId: string;
};

const InviteLinkButton = ({ calendarId }: InviteLinkButtonProps) => {
  const { t } = useTranslation();
  const createInvite = useCreateInvite();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = useCallback(async () => {
    const member = await createInvite.mutateAsync(calendarId);
    const url = `${window.location.origin}/invite/${member.invite_token}`;
    setInviteUrl(url);
  }, [calendarId, createInvite]);

  const handleCopy = useCallback(async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [inviteUrl]);

  return (
    <div className="space-y-2">
      {inviteUrl ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={inviteUrl}
            className="flex-1 rounded-lg border border-[var(--border)] bg-bg-secondary px-3 py-1.5 text-xs text-text-primary truncate"
          />
          <button
            type="button"
            onClick={handleCopy}
            className={clsx(
              'rounded-md p-1.5 transition-colors',
              copied
                ? 'text-[#34A853] bg-bg-secondary'
                : 'text-text-tertiary hover:bg-bg-secondary',
            )}
            title={t('sharedCal.copy')}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          onClick={handleGenerate}
          loading={createInvite.isPending}
        >
          <Link className="h-3.5 w-3.5" />
          {t('sharedCal.generateInvite')}
        </Button>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Calendar row (expandable)
// ---------------------------------------------------------------------------

type CalendarRowProps = {
  calendar: SharedCalendar;
  isOwner: boolean;
  member: SharedCalendarMember | undefined;
};

const CalendarRow = ({ calendar, isOwner, member }: CalendarRowProps) => {
  const { t } = useTranslation();
  const updateCal = useUpdateSharedCalendar();
  const deleteCal = useDeleteSharedCalendar();
  const removeMember = useRemoveSharedCalendarMember();
  const toggleVisibility = useToggleMemberVisibility();

  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(calendar.title);
  const [editColor, setEditColor] = useState(calendar.color);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSaveEdit = useCallback(() => {
    if (!editTitle.trim()) return;
    updateCal.mutate({
      id: calendar.id,
      patch: { title: editTitle.trim(), color: editColor },
    });
    setEditing(false);
  }, [calendar.id, editTitle, editColor, updateCal]);

  const handleDelete = useCallback(() => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    deleteCal.mutate(calendar.id);
    setConfirmDelete(false);
  }, [calendar.id, confirmDelete, deleteCal]);

  const handleLeave = useCallback(() => {
    if (!member) return;
    removeMember.mutate(member.id);
  }, [member, removeMember]);

  const handleToggleVisibility = useCallback(() => {
    if (!member) return;
    toggleVisibility.mutate({
      memberId: member.id,
      isVisible: !member.is_visible,
    });
  }, [member, toggleVisibility]);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-bg-primary overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-text-tertiary hover:text-text-primary transition-colors"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: calendar.color }}
        />

        <div className="flex flex-1 items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-text-primary truncate">
            {calendar.title}
          </span>
          <span
            className={clsx(
              'shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
              isOwner
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
            )}
          >
            {isOwner ? (
              <>
                <Crown className="h-2.5 w-2.5" />
                {t('sharedCal.owner')}
              </>
            ) : (
              <>
                <Users className="h-2.5 w-2.5" />
                {t('sharedCal.member')}
              </>
            )}
          </span>
        </div>

        {/* Visibility toggle (for members) */}
        {member && (
          <button
            type="button"
            role="switch"
            aria-checked={member.is_visible}
            onClick={handleToggleVisibility}
            className={clsx(
              'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
              member.is_visible ? 'bg-[var(--accent)]' : 'bg-bg-tertiary',
            )}
          >
            <span
              className={clsx(
                'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
                member.is_visible ? 'translate-x-4' : 'translate-x-0',
              )}
            />
          </button>
        )}
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="border-t border-[var(--border)] px-4 py-3 space-y-3">
          {isOwner ? (
            <>
              {/* Edit form */}
              {editing ? (
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-text-secondary">{t('sharedCal.calTitle')}</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className={clsx(
                        'mt-1 w-full rounded-lg border border-[var(--border)] bg-bg-secondary px-3 py-2 text-sm text-text-primary',
                        'placeholder:text-text-tertiary',
                        'focus:outline-none focus:ring-2 focus:ring-[var(--accent)]',
                      )}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-secondary">{t('subscription.color')}</label>
                    <div className="mt-1 flex gap-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setEditColor(color)}
                          className={clsx(
                            'h-6 w-6 rounded-full transition-transform',
                            editColor === color && 'ring-2 ring-offset-2 ring-[var(--accent)] scale-110',
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveEdit} disabled={!editTitle.trim()}>
                      {t('common.save')}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setEditing(false);
                        setEditTitle(calendar.title);
                        setEditColor(calendar.color);
                      }}
                    >
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                  {t('sharedCal.editTitleColor')}
                </button>
              )}

              {/* Invite link */}
              <InviteLinkButton calendarId={calendar.id} />

              {/* Member list */}
              <MemberList calendarId={calendar.id} isOwner />

              {/* Delete */}
              <div className="pt-2 border-t border-[var(--border)]">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {confirmDelete ? t('sharedCal.confirmDelete') : t('sharedCal.deleteCalendar')}
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Member list (read-only) */}
              <MemberList calendarId={calendar.id} isOwner={false} />

              {/* Leave */}
              <div className="pt-2 border-t border-[var(--border)]">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleLeave}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {t('sharedCal.leave')}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const SharedCalendarManager = () => {
  const { t } = useTranslation();
  const userId = useUserId();
  const { data: calendars = [] } = useSharedCalendars();
  const createCal = useCreateSharedCalendar();

  const [showAddForm, setShowAddForm] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  const [addColor, setAddColor] = useState(DEFAULT_COLOR);

  const handleAdd = useCallback(async () => {
    if (!addTitle.trim() || !userId) return;

    const now = new Date().toISOString();
    const cal: SharedCalendar = {
      id: crypto.randomUUID(),
      owner_id: userId,
      title: addTitle.trim(),
      color: addColor,
      created_at: now,
      updated_at: now,
    };

    await createCal.mutateAsync(cal);
    setAddTitle('');
    setAddColor(DEFAULT_COLOR);
    setShowAddForm(false);
  }, [addTitle, addColor, userId, createCal]);

  // Build a lookup: for calendars the user is a member of (not owner),
  // we need the member record to support visibility toggle / leave.
  // We render per-calendar member queries lazily inside CalendarRow.

  return (
    <div className="space-y-3">
      {/* Calendar list */}
      {calendars.map((cal) => {
        const isOwner = cal.owner_id === userId;
        return (
          <CalendarRowWithMember
            key={cal.id}
            calendar={cal}
            isOwner={isOwner}
            userId={userId}
          />
        );
      })}

      {/* Add form */}
      {showAddForm ? (
        <div className="space-y-3 rounded-lg border border-[var(--border)] bg-bg-primary p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-primary">
              {t('sharedCal.createCalendar')}
            </span>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
              }}
              className="rounded-md p-1 text-text-tertiary hover:bg-bg-secondary transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-xs text-text-secondary" htmlFor="shared-cal-title">
                {t('sharedCal.calTitle')}
              </label>
              <input
                id="shared-cal-title"
                type="text"
                value={addTitle}
                onChange={(e) => setAddTitle(e.target.value)}
                placeholder={t('sharedCal.calendarName')}
                className={clsx(
                  'mt-1 w-full rounded-lg border border-[var(--border)] bg-bg-secondary px-3 py-2 text-sm text-text-primary',
                  'placeholder:text-text-tertiary',
                  'focus:outline-none focus:ring-2 focus:ring-[var(--accent)]',
                )}
              />
            </div>

            <div>
              <label className="text-xs text-text-secondary">{t('subscription.color')}</label>
              <div className="mt-1 flex gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setAddColor(color)}
                    className={clsx(
                      'h-6 w-6 rounded-full transition-transform',
                      addColor === color && 'ring-2 ring-offset-2 ring-[var(--accent)] scale-110',
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <Button
            size="sm"
            onClick={handleAdd}
            loading={createCal.isPending}
            disabled={!addTitle.trim() || !userId}
            className="w-full"
          >
            {t('sharedCal.create')}
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className={clsx(
            'flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border)] px-4 py-3',
            'text-sm text-text-secondary hover:bg-bg-secondary hover:border-text-tertiary transition-colors',
          )}
        >
          <Plus className="h-4 w-4" />
          {t('sharedCal.createCalendar')}
        </button>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Wrapper to lazily fetch member record for the current user
// ---------------------------------------------------------------------------

type CalendarRowWithMemberProps = {
  calendar: SharedCalendar;
  isOwner: boolean;
  userId: string | null;
};

const CalendarRowWithMember = ({
  calendar,
  isOwner,
  userId,
}: CalendarRowWithMemberProps) => {
  const { data: members = [] } = useSharedCalendarMembers(calendar.id);
  const myMember = members.find(
    (m) => m.user_id === userId && m.status === 'active',
  );

  return (
    <CalendarRow
      calendar={calendar}
      isOwner={isOwner}
      member={myMember}
    />
  );
};
