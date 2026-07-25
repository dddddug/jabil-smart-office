import { ref, watch } from 'vue';

// 语言配置
export type Language = 'zh' | 'en';

// 界面风格
export type Theme = 'default' | 'dark' | 'blue' | 'green';

// 护眼模式
export type EyeCareMode = 'none' | 'warm' | 'soft';

// 设置状态
export const language = ref<Language>(
  (localStorage.getItem('language') as Language) || 'zh'
);

export const theme = ref<Theme>(
  (localStorage.getItem('theme') as Theme) || 'default'
);

export const eyeCareMode = ref<EyeCareMode>(
  (localStorage.getItem('eyeCareMode') as EyeCareMode) || 'none'
);

// 监听变化并保存到 localStorage
watch(language, (newVal) => {
  localStorage.setItem('language', newVal);
  applyTheme();
});

watch(theme, (newVal) => {
  localStorage.setItem('theme', newVal);
  applyTheme();
});

watch(eyeCareMode, (newVal) => {
  localStorage.setItem('eyeCareMode', newVal);
  applyTheme();
});

// 应用主题
export function applyTheme() {
  const html = document.documentElement;
  
  // 移除所有主题类
  html.classList.remove('theme-default', 'theme-dark', 'theme-blue', 'theme-green');
  html.classList.remove('eye-care-none', 'eye-care-warm', 'eye-care-soft');
  
  // 添加主题类
  html.classList.add(`theme-${theme.value}`);
  html.classList.add(`eye-care-${eyeCareMode.value}`);
}

// 切换语言
export function toggleLanguage() {
  language.value = language.value === 'zh' ? 'en' : 'zh';
}

// 切换主题
export function setTheme(newTheme: Theme) {
  theme.value = newTheme;
}

// 切换护眼模式
export function setEyeCareMode(mode: EyeCareMode) {
  eyeCareMode.value = mode;
}

// 初始化主题
applyTheme();
