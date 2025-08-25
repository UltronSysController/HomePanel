import React from 'react';
import { X, Check } from 'lucide-react';
import useSmartHomeStore from '../store';
import styles from './GroupSelector.module.css';

interface GroupSelectorProps {
  onClose: () => void;
}

const GroupSelector: React.FC<GroupSelectorProps> = ({ onClose }) => {
  const { groups, currentGroupId, selectGroup } = useSmartHomeStore();

  const handleSelectGroup = async (groupId: string) => {
    await selectGroup(groupId);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <header className={styles.header}>
          <h2>選擇家居</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="關閉">
            <X size={24} />
          </button>
        </header>

        <div className={styles.groupList}>
          {groups.map(group => (
            <button
              key={group.groupId}
              className={`${styles.groupItem} ${group.groupId === currentGroupId ? styles.active : ''}`}
              onClick={() => handleSelectGroup(group.groupId)}
            >
              <div className={styles.groupInfo}>
                <h3>{group.name}</h3>
                <p>{group.deviceCount} 個配件</p>
              </div>
              {group.groupId === currentGroupId && (
                <Check size={24} className={styles.checkIcon} />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GroupSelector;