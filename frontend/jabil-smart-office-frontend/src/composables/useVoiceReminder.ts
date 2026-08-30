// 语音提醒 composable，使用 Web Speech API
import { ref } from 'vue';

const lastSpokenTime = ref<Record<string, number>>({});
const SPEAK_COOLDOWN = 30000; // 同一提醒 30 秒内不重复播放

// 播放语音提醒
export function useVoiceReminder() {
  const speak = (text: string, key: string = 'default') => {
    // 检查冷却时间
    const now = Date.now();
    if (lastSpokenTime.value[key] && now - lastSpokenTime.value[key] < SPEAK_COOLDOWN) {
      return;
    }

    // 检查浏览器是否支持语音合成
    if (!('speechSynthesis' in window)) {
      console.warn('[VoiceReminder] 浏览器不支持语音合成');
      return;
    }

    // 取消之前的语音
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN'; // 设置中文
    utterance.rate = 1.0; // 语速
    utterance.pitch = 1.0; // 音调

    utterance.onstart = () => {
      lastSpokenTime.value[key] = now;
    };

    utterance.onerror = (event) => {
      console.error('[VoiceReminder] 播放失败:', event);
    };

    window.speechSynthesis.speak(utterance);
  };

  // K045 待接收/待签收提醒
  const checkK045Pending = (pendingReceive: number, pendingSign: number) => {
    if (pendingReceive > 0) {
      speak(`您有 ${pendingReceive} 条K045单据待接收`, 'k045-pendingReceive');
    }
    if (pendingSign > 0) {
      speak(`您有 ${pendingSign} 条K045单据待签收`, 'k045-pendingSign');
    }
  };

  // 管控物料待接收提醒
  const checkDAMaterialPending = (pendingCount: number) => {
    if (pendingCount > 0) {
      speak(`您有 ${pendingCount} 条管控物料单据待接收`, 'daMaterial-pending');
    }
  };

  // 排班变动提醒
  const checkScheduleChange = (changes: { employeeName: string; changeType: string }[]) => {
    if (changes.length > 0) {
      const names = changes.slice(0, 3).map(c => c.employeeName).join('、');
      const suffix = changes.length > 3 ? '等' : '';
      speak(`${names}${suffix}的排班有变动，请注意查看`, 'schedule-change');
    }
  };

  // 请假审批提醒
  const checkLeaveApprovalPending = (pendingCount: number) => {
    if (pendingCount > 0) {
      speak(`您有 ${pendingCount} 条请假公差申请待审批`, 'leave-approval');
    }
  };

  return {
    speak,
    checkK045Pending,
    checkDAMaterialPending,
    checkScheduleChange,
    checkLeaveApprovalPending
  };
}
