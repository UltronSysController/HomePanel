# Claude Development Notes

## 開發合作原則
- **先討論分析方案，確認後再執行** - 所有功能開發都應該先討論分析，確認方案後再實施
- 有任何 UltronSMART API / Ultron Cloud API 問題時，請查 /aaron0624/Projects/cms-server-main 再進行

## Recent Updates and Fixes

### 1. Sidebar Collapse/Expand Functionality
- Added a collapsible sidebar with smooth transitions
- Sidebar width: 240px (expanded) → 68px (collapsed)
- Toggle button in top-right corner of sidebar

### 2. Room Name and Icon Editing
- **When Expanded**: Users can click on room names to edit them and click on icons to change them
- **When Collapsed**: Editing functionality is completely disabled
- Icon picker includes comprehensive emoji selection for different room types

### 3. Sidebar Icon Centering When Collapsed

#### Problem
When the sidebar is collapsed, navigation icons (Home, Automation, Discover) were not centered properly - they remained left-aligned.

#### Solution
The issue was that `.nav-text` elements, although visually hidden with `opacity: 0` and `width: 0`, were still taking up space in the flex container. 

**Key fix**: Changed from hiding with opacity/width to completely removing from layout:
```css
.sidebar.collapsed .nav-text {
  display: none;
}
```

This ensures that when the sidebar is collapsed, only the icons remain in the flex container, allowing `justify-content: center` on the parent `.nav-item` to properly center them.

#### Related CSS for collapsed sidebar:
```css
.sidebar.collapsed .nav-item {
  padding: 10px 0;
  justify-content: center;
  align-items: center;
  min-height: 44px;
  width: 100%;
  gap: 0;
  display: flex;
  flex-direction: row;
}
```

### 4. Hover Effects Management
- Room icons and navigation icons have hover effects when sidebar is expanded
- All hover effects are disabled when sidebar is collapsed for cleaner appearance

### 5. Component Updates

#### RoomNameEditor Component
- Added `isCollapsed` prop to handle collapsed state
- Prevents icon and name editing when sidebar is collapsed
- Removes unnecessary tooltips in collapsed state

#### HomePage Component  
- Added `sidebarCollapsed` state management
- Passes collapsed state to child components
- Handles sidebar toggle functionality

### 6. CSS Organization
- Main sidebar styles in `HomePage.css`
- Room editing styles in `RoomNameEditor.css`
- Proper cascade and specificity for collapsed states

## Key Development Patterns

### State Management
- Using Zustand for global state management
- Persistent storage for:
  - API configuration
  - Room configurations
  - Device-room assignments
  - Custom device names

### API Integration
- Proxy server running on port 3001 to handle CORS
- React app on port 3000
- All API calls go through the proxy server

### Responsive Design
- Mobile-first approach
- Sidebar transforms to bottom navigation on mobile
- Proper touch targets and spacing

## Common Issues and Solutions

### Issue: Device room assignments not persisting
**Solution**: Check localStorage and ensure `deviceRoomAssignments` is properly saved in the Zustand store's `partialize` function.

### Issue: Proxy server connection refused
**Solution**: Start the proxy server:
```bash
cd proxy-server && npm start
```
Or run in background:
```bash
cd proxy-server && nohup npm start > server.log 2>&1 &
```

### Issue: Icons not centering when sidebar collapsed
**Solution**: Use `display: none` instead of `opacity: 0` for hidden elements to prevent them from taking up flex space.

## Device Groups (iOS-style)

### 功能說明
實現了類似 iOS Home 的設備群組功能，可以將相同類型的設備組合在一起統一控制。

### 拖放創建群組
1. **位置判斷**：
   - 拖到設備卡片**左側 25%**：調整設備順序（顯示藍色插入線）
   - 拖到設備卡片**右側 75%**：創建群組（僅限相同類型設備）

2. **創建群組**：
   - 拖拉一個設備到另一個相同類型設備的右側區域
   - 停留 1 秒後自動創建群組
   - 群組名稱：`設備1 + 設備2`

3. **群組顯示**：
   - 堆疊卡片效果
   - 右上角數字徽章顯示設備數量
   - 顯示群組狀態（如 "2/3 開啟"）

4. **群組操作**：
   - 點擊電源按鈕同時控制所有設備
   - 拖拉相同類型設備到群組上自動加入
   - 群組只剩一個設備時自動解散

### 實現細節
- 群組資料結構：`DeviceGroup` interface
- 群組狀態管理：Zustand store with persistence
- 群組卡片元件：`DeviceGroupCard`
- 拖放邏輯增強：基於滑鼠位置判斷操作類型

### 注意事項
- 若群組創建似乎沒有生效，請檢查瀏覽器控制台的除錯訊息
- 確保拖放時停留足夠時間（1秒）
- 只有相同類型的設備才能組成群組

## Testing Checklist
- [ ] Sidebar collapse/expand animation smooth
- [ ] Icons properly centered when collapsed
- [ ] Room editing disabled when collapsed
- [ ] Hover effects only show when expanded
- [ ] Device room assignments persist after refresh
- [ ] Proxy server handles API calls correctly
- [ ] Device groups create correctly when dragging to right 75% of card
- [ ] Device reordering works when dragging to left 25% of card
- [ ] Groups persist after page refresh
- [ ] Group power control toggles all devices
- [ ] Groups auto-dissolve when only one device remains