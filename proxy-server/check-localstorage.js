// 在瀏覽器控制台運行這個來檢查 localStorage
console.log('Checking localStorage for smart-home-storage:');
const stored = localStorage.getItem('smart-home-storage');
if (stored) {
  const parsed = JSON.parse(stored);
  console.log('Stored state:', parsed);
  console.log('Device room assignments:', parsed.state?.deviceRoomAssignments);
} else {
  console.log('No stored data found');
}
