'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { clsx } from 'clsx';
import { Trash2 } from 'lucide-react';
import { Modal } from '@todome/ui/src/modal';
import { Input } from '@todome/ui/src/input';
import { Button } from '@todome/ui/src/button';
import { useTranslation } from '@todome/store';
import {
  useTodoLists,
  useCreateTodoList,
  useUpdateTodoList,
  useDeleteTodoList,
  useUserId,
} from '@/hooks/queries';

const PRESET_COLORS = [
  '#4285F4', '#EA4335', '#FBBC04', '#34A853',
  '#FF6D01', '#46BDC6', '#7986CB', '#E67C73',
] as const;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  editListId?: string | null;
};

export const TodoListDialog = ({ isOpen, onClose, editListId }: Props) => {
  const { t } = useTranslation();
  const userId = useUserId();
  const { data: lists = [] } = useTodoLists();
  const createList = useCreateTodoList();
  const updateList = useUpdateTodoList();
  const deleteList = useDeleteTodoList();

  const editingList = editListId
    ? lists.find((l) => l.id === editListId) ?? null
    : null;

  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(PRESET_COLORS[0]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (editingList) {
      setName(editingList.name);
      setColor(editingList.color ?? PRESET_COLORS[0]);
    } else {
      setName('');
      setColor(PRESET_COLORS[0]);
    }
    setShowDeleteConfirm(false);
  }, [editingList, isOpen]);

  const handleSave = useCallback(() => {
    if (!name.trim() || !userId) return;

    if (editingList) {
      updateList.mutate({
        id: editingList.id,
        patch: { name: name.trim(), color },
      });
    } else {
      const now = new Date().toISOString();
      const maxOrder = lists.reduce((max, l) => Math.max(max, l.sort_order), 0);
      createList.mutate({
        id: crypto.randomUUID(),
        user_id: userId,
        name: name.trim(),
        color,
        icon: 'list',
        sort_order: maxOrder + 1,
        is_deleted: false,
        created_at: now,
        updated_at: now,
      });
    }
    onClose();
  }, [name, color, userId, editingList, lists, createList, updateList, onClose]);

  const handleDelete = useCallback(() => {
    if (!editingList) return;
    deleteList.mutate(editingList.id);
    onClose();
  }, [editingList, deleteList, onClose]);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={editingList ? t('todos.editList') : t('todos.addList')}
    >
      <div className="space-y-4">
        {/* Name */}
        <Input
          label={t('todos.listName')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('todos.listName')}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              handleSave();
            }
          }}
        />

        {/* Color picker */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-secondary">
            {t('todos.listColor')}
          </label>
          <div className="flex gap-2 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={clsx(
                  'h-8 w-8 rounded-full transition-all duration-150',
                  color === c
                    ? 'ring-2 ring-offset-2 ring-[var(--accent)] scale-110'
                    : 'hover:scale-105',
                )}
                style={{ backgroundColor: c }}
                aria-label={c}
              />
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-secondary">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm text-text-primary">
            {name.trim() || t('todos.listName')}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          {editingList && !showDeleteConfirm && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4" />
              {t('todos.deleteList')}
            </Button>
          )}
          {showDeleteConfirm && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-text-secondary">{t('todos.deleteListConfirm')}</span>
              <Button variant="danger" size="sm" onClick={handleDelete}>
                {t('common.delete')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
              >
                {t('common.cancel')}
              </Button>
            </div>
          )}
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={!name.trim()}
          >
            {editingList ? t('common.save') : t('todos.addList')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
