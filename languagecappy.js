$(function () {
  // Đổi tên model tại đây nếu Google thay đổi model hoặc hạn mức trong tương lai.
  const MODEL = 'gemini-3.5-flash-lite';
  const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent';

  let currentLang = 'en'; // 'en' | 'zh'
  let keyboardMode = 'pinyin'; // 'pinyin' | 'device'

  const DEFAULT_API_KEY_EN = atob('QVEuQWI4Uk42Sk9YVjdtTFpKMHVUX3lYMTVQcjRNTDFYVU1QZlFubmI4NkxjeUktYXhpSFE=');
  const DEFAULT_API_KEY_ZH = atob('QVEuQWI4Uk42TEhOQkNXU0hFVk0yc0N0RnFmV2JnSDIzdlVlWHRNaGdMMERaUTZObjRIa2c=');
  const FIREBASE_BASE_URL = 'https://englishtalk-17f02-default-rtdb.asia-southeast1.firebasedatabase.app';

  // System Prompts
  const SYSTEM_PROMPT_EN = 'You are a kind English conversation partner and language coach for a beginner. ' +
    'The user must communicate ONLY in English. ' +
    'If the user message is in Vietnamese (with or without diacritics/accents) or any other non-English language: ' +
    'set assessment to "not_target_lang", reply to "I don\'t understand, please speak English.", ' +
    'replyVi to "Tôi không hiểu, vui lòng nói tiếng Anh.", suggested to "", and explanationVi to "Vui lòng sử dụng tiếng Anh khi trò chuyện.". ' +
    'Otherwise, for English input: assess the English text for meaningful errors or awkward wording. ' +
    'Use assessment "correction" for an actual grammar or word-choice error, "naturalness" for a grammatically acceptable but noticeably awkward phrase, and "correct" when it is already fine. ' +
    'Accept natural conversational fragments, informal wording and contractions; do not invent errors. ' +
    'Ignore capitalization and punctuation alone because the text may be transcribed from speech. ' +
    'Never claim to assess pronunciation or accent from a transcript. ' +
    'If a change is needed, provide the full suggested English sentence, keeping the original meaning, and one short explanation in Vietnamese. ' +
    'When the sentence is already fine, use empty strings for suggested and explanationVi. ' +
    'Also continue the conversation in reply: one or two short, natural spoken English sentences, with a brief follow-up question when appropriate. ' +
    'Provide replyVi: the accurate and natural Vietnamese translation of the reply. ' +
    'Use plain text without Markdown, emojis, lists or stage directions. Follow the requested JSON schema.';

  const SYSTEM_PROMPT_ZH = 'You are a kind Chinese (Mandarin) conversation partner and language coach for a beginner. ' +
    'The user must communicate ONLY in Chinese (Chinese characters or Pinyin). ' +
    'If the user message is in Vietnamese or English or any non-Chinese language: ' +
    'set assessment to "not_target_lang", reply to "我听不懂，请说中文。", ' +
    'replyVi to "Tôi không hiểu, vui lòng nói tiếng Hoa.", suggested to "", and explanationVi to "Vui lòng sử dụng tiếng Hoa (chữ Hán hoặc Pinyin) khi trò chuyện.". ' +
    'Otherwise, for Chinese input: assess the Chinese text for meaningful errors or awkward wording. ' +
    'Use assessment "correction" for an actual grammar or word-choice error, "naturalness" for a grammatically acceptable but noticeably awkward phrase, and "correct" when it is already fine. ' +
    'Accept natural conversational fragments, informal wording; do not invent errors. ' +
    'Ignore punctuation alone because the text may be transcribed from speech. ' +
    'Never claim to assess spoken pronunciation or accent from a transcript. ' +
    'If a change is needed, provide the full suggested Chinese sentence in Simplified Chinese (with Pinyin in parentheses), keeping the original meaning, and one short explanation in Vietnamese. ' +
    'When the sentence is already fine, use empty strings for suggested and explanationVi. ' +
    'Also continue the conversation in reply: one or two short, natural spoken Chinese sentences, with a brief follow-up question when appropriate. ' +
    'Provide replyVi: the accurate and natural Vietnamese translation of the reply. ' +
    'Use plain text without Markdown, emojis, lists or stage directions. Follow the requested JSON schema.';

  const COACH_SCHEMA = {
    type: 'object',
    properties: {
      assessment: { type: 'string', enum: ['correct', 'correction', 'naturalness', 'not_english', 'not_target_lang'], description: 'Whether the wording is fine, has an error, is awkward, or is not in target language.' },
      suggested: { type: 'string', description: 'Complete suggested sentence in target language, or an empty string if already fine or not in target language.' },
      explanationVi: { type: 'string', description: 'One short Vietnamese explanation of the change, or an empty string if already fine.' },
      reply: { type: 'string', description: 'The natural conversational reply to the user in target language.' },
      replyVi: { type: 'string', description: 'The natural and accurate Vietnamese translation of the reply.' }
    },
    required: ['assessment', 'suggested', 'explanationVi', 'reply', 'replyVi']
  };

  const PINYIN_DICT = {
    'ni': ['你', '您', '呢', '泥', '拟'],
    'hao': ['好', '号', '毫', '浩', '豪'],
    'nihao': ['你好', '您好'],
    'wo': ['我', '握', '窝', '卧'],
    'ta': ['他', '她', '它', '踏'],
    'men': ['们', '门', '闷'],
    'women': ['我们'],
    'nimen': ['你们'],
    'tamen': ['他们', '她们'],
    'shi': ['是', '十', '事', '时', '市', '视', '师'],
    'bu': ['不', '步', '布', '部'],
    'bushi': ['不是'],
    'de': ['的', '得', '地'],
    'le': ['了', '乐'],
    'ma': ['吗', '妈', '马', '骂'],
    'ne': ['呢', '呐'],
    'ba': ['吧', '八', '爸', '把'],
    'xie': ['写', '些', '谢', '鞋'],
    'xiexie': ['谢谢'],
    'zai': ['在', '再', '载'],
    'jian': ['见', '件', '间', '建'],
    'zaijian': ['再见'],
    'qing': ['请', '情', '清', '晴'],
    'wen': ['问', '文', '闻', '温'],
    'qingwen': ['请问'],
    'dui': ['对', '队'],
    'qi': ['起', '七', '期', '气', '其'],
    'duibuqi': ['对不起'],
    'mei': ['没', '美', '每', '妹'],
    'guan': ['关', '观', '馆'],
    'xi': ['系', '西', '喜', '洗'],
    'meiguanxi': ['没关系'],
    'ke': ['客', '可', '课', '刻'],
    'bukeqi': ['不客气'],
    'shen': ['什', '深', '神'],
    'me': ['么'],
    'shenme': ['什么'],
    'zen': ['怎'],
    'zenme': ['怎么'],
    'zenmeyang': ['怎么样'],
    'shui': ['谁', '水', '睡'],
    'shei': ['谁'],
    'na': ['那', '哪'],
    'li': ['里', '力', '立', '离'],
    'nali': ['哪里', '那里'],
    'nar': ['哪儿', '那儿'],
    'duo': ['多', '朵'],
    'shao': ['少', '绍', '烧'],
    'duoshao': ['多少'],
    'ji': ['几', '机', '极', '寄'],
    'xihuan': ['喜欢'],
    'xiang': ['想', '向', '像', '相'],
    'yao': ['要', '药', '咬'],
    'you': ['有', '又', '友', '右'],
    'meiyou': ['没有'],
    'hen': ['很', '恨'],
    'tai': ['太', '态'],
    'chi': ['吃', '迟', '池'],
    'chifan': ['吃饭'],
    'he': ['喝', '和', '何', '河'],
    'hecha': ['喝茶'],
    'qu': ['去', '取', '趣'],
    'lai': ['来', '赖'],
    'xue': ['学', '雪'],
    'xuexi': ['学习'],
    'xuesheng': ['学生'],
    'laoshi': ['老师'],
    'shuo': ['说', '硕'],
    'shuohua': ['说话'],
    'kan': ['看', '砍'],
    'ting': ['听', '停', '厅'],
    'zhong': ['中', '种', '重'],
    'zhongwen': ['中文'],
    'hanyu': ['汉语'],
    'zhongguo': ['中国'],
    'jin': ['今', '进', '近', '金'],
    'tian': ['天', '田', '填'],
    'jintian': ['今天'],
    'ming': ['明', '名', '命'],
    'mingtian': ['明天'],
    'xian': ['现', '先', '线'],
    'xianzai': ['现在'],
    'dian': ['点', '电', '店'],
    'qian': ['钱', '前', '千'],
    'kuai': ['块', '快', '筷'],
    'ge': ['个', '歌', '各'],
    'jia': ['家', '加', '假'],
    'ren': ['人', '任', '认'],
    'pengyou': ['朋友'],
    'shuijiao': ['睡觉'],
    'gongzuo': ['工作'],
    'gaoxing': ['高兴'],
    'renshi': ['认识'],
    'shang': ['上', '商', '伤'],
    'xia': ['下', '夏'],
    'zuo': ['做', '作', '坐', '左'],
    'mai': ['买', '卖'],
    'dongxi': ['东西'],
    'yi': ['一', '以', '已', '意'],
    'er': ['二', '儿', '耳'],
    'san': ['三', '伞'],
    'si': ['四', '思', '死'],
    'wu': ['五', '午', '屋'],
    'liu': ['六', '流', '留'],
    'qi': ['七', '期', '起'],
    'ba': ['八', '爸', '把'],
    'jiu': ['九', '酒', '久']
  };

  const $key = $('#api-key');
  $key.val(DEFAULT_API_KEY_EN);
  const $message = $('#message');
  const $messages = $('#messages');
  const $record = $('#record');
  const $send = $('#send');
  const $status = $('#status');
  const $openHistoryEnBtn = $('#open-history-en-btn');
  const $openHistoryZhBtn = $('#open-history-zh-btn');
  const $newChatBtn = $('#new-chat-btn');
  const $historyModal = $('#history-modal');
  const $historyList = $('#history-list');
  const $closeHistoryModal = $('#close-history-modal');
  const $clearAllSessionsBtn = $('#clear-all-sessions-btn');
  let activeHistoryTab = 'en';

  let currentPinyin = '';
  let currentCandidates = [];

  async function fetchGoogleInputCandidates(pinyinText) {
    const q = (pinyinText || '').trim().toLowerCase();
    if (!q) {
      currentCandidates = [];
      $('#pinyin-candidates-bar').empty();
      return;
    }

    try {
      const url = 'https://inputtools.google.com/request?text=' + encodeURIComponent(q) + '&itc=zh-t-i0-pinyin&num=11&cp=0&cs=1&ie=utf-8&oe=utf-8&app=demopage';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data && data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1]) {
          renderCandidates(data[1][0][1]);
          return;
        }
      }
    } catch (err) {
      console.warn('Lỗi gọi Google Input Tools:', err);
    }

    // Fallback sang từ điển nội bộ nếu mất mạng
    let matches = [];
    if (PINYIN_DICT[q]) {
      matches = PINYIN_DICT[q];
    } else {
      const keys = Object.keys(PINYIN_DICT).filter(k => k.startsWith(q));
      keys.slice(0, 5).forEach(k => {
        matches = matches.concat(PINYIN_DICT[k]);
      });
      matches = Array.from(new Set(matches));
    }
    renderCandidates(matches.length > 0 ? matches : [q]);
  }

  function renderCandidates(candidatesList) {
    currentCandidates = candidatesList || [];
    const $bar = $('#pinyin-candidates-bar');
    $bar.empty();

    if (!currentCandidates.length) return;

    currentCandidates.slice(0, 10).forEach((word, idx) => {
      const $btn = $('<button>').attr({ type: 'button' }).addClass('cand-item');
      $('<span>').addClass('cand-num').text(idx + 1).appendTo($btn);
      $btn.append(document.createTextNode(word));

      $btn.on('click', function () {
        insertTextIntoMessage(word);
        clearCurrentPinyin();
        $message.trigger('focus');
      });

      $bar.append($btn);
    });
  }

  function appendPinyinChar(char) {
    currentPinyin += char.toLowerCase();
    $('#pinyin-current-text').text(currentPinyin);
    $('#pinyin-clear-btn').show();
    fetchGoogleInputCandidates(currentPinyin);
  }

  function removeLastPinyinChar() {
    if (currentPinyin.length > 0) {
      currentPinyin = currentPinyin.slice(0, -1);
      $('#pinyin-current-text').text(currentPinyin);
      if (currentPinyin.length === 0) {
        clearCurrentPinyin();
      } else {
        fetchGoogleInputCandidates(currentPinyin);
      }
    } else {
      const val = $message.val();
      if (val.length > 0) {
        $message.val(val.slice(0, -1)).trigger('input');
      }
    }
  }

  function clearCurrentPinyin() {
    currentPinyin = '';
    currentCandidates = [];
    $('#pinyin-current-text').text('');
    $('#pinyin-clear-btn').hide();
    $('#pinyin-candidates-bar').empty();
  }

  function showPinyinKeyboard() {
    keyboardMode = 'pinyin';
    $('#btn-toggle-pinyin-kb').addClass('active').text('⌨️ Ẩn Pinyin');
    $('#btn-device-kb').removeClass('active');
    $('#kb-device-note').hide();
    $('#pinyin-keyboard-panel').slideDown(150);
  }

  function hidePinyinKeyboard() {
    $('#btn-toggle-pinyin-kb').removeClass('active').text('⌨️ Bàn phím Pinyin');
    $('#pinyin-keyboard-panel').slideUp(150);
  }

  function insertTextIntoMessage(textToInsert) {
    const el = $message[0];
    const val = el.value;
    const start = el.selectionStart || val.length;
    const end = el.selectionEnd || val.length;
    el.value = val.substring(0, start) + textToInsert + val.substring(end);
    el.selectionStart = el.selectionEnd = start + textToInsert.length;
    $message.trigger('input');
  }

  async function getUserInt(username) {
    const stored = sessionStorage.getItem('cappy_user_int');
    if (stored !== null && stored !== undefined && stored !== '') {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed)) return parsed;
    }
    if (!username) return null;
    try {
      const res = await fetch(FIREBASE_BASE_URL + '/users/' + encodeURIComponent(username) + '.json?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const uData = await res.json();
        if (uData && (uData.int !== undefined && uData.int !== null)) {
          const uInt = parseInt(uData.int, 10);
          sessionStorage.setItem('cappy_user_int', String(uInt));
          return uInt;
        }
      }
    } catch (e) {
      console.warn('Lỗi lấy user int:', e);
    }
    return null;
  }

  async function fetchApiKeyForCurrentLang() {
    const isZh = (currentLang === 'zh');
    const langName = isZh ? 'Tiếng Hoa' : 'Tiếng Anh';
    const defaultKey = isZh ? DEFAULT_API_KEY_ZH : DEFAULT_API_KEY_EN;

    const $badge = $('#api-status-badge');
    $badge.removeClass('success error').addClass('checking').text('Đang lấy API key từ Firebase…');

    // 1. Kiểm tra tài khoản đăng nhập và lấy key theo int từ api_key_gemnini
    const loggedUser = sessionStorage.getItem('cappy_logged_user');
    const userInt = await getUserInt(loggedUser);

    if (userInt !== null && !isNaN(userInt)) {
      $badge.removeClass('success error').addClass('checking').text(`Đang lấy API key (User: ${loggedUser}, int: ${userInt})…`);
      try {
        const resGem = await fetch(FIREBASE_BASE_URL + '/api_key_gemnini.json?t=' + Date.now(), { cache: 'no-store' });
        if (resGem.ok) {
          const gemData = await resGem.json();
          const items = Array.isArray(gemData) ? gemData : Object.values(gemData || {});
          const matched = items.find(item => item && (item.int === userInt || String(item.int) === String(userInt)));
          if (matched && matched.key && matched.key.trim()) {
            const activeKey = matched.key.trim();
            $key.val(activeKey);
            await checkGeminiConnection(activeKey);
            return activeKey;
          }
        }
      } catch (err) {
        console.warn('Lỗi lấy api_key_gemnini theo user int:', err);
      }
    }

    // 2. Dự phòng: lấy key theo ngôn ngữ từ /api_keys
    const firebasePath = isZh ? '/api_keys/gemini_chinese.json' : '/api_keys/gemini_english.json';
    try {
      const res = await fetch(FIREBASE_BASE_URL + firebasePath + '?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const key = (typeof data === 'string' ? data : (data && (data.key || data.apiKey))) || '';
        if (key && key.trim()) {
          const activeKey = key.trim();
          $key.val(activeKey);
          await checkGeminiConnection(activeKey);
          return activeKey;
        }
      }
    } catch (err) {
      console.warn('Lỗi lấy API key từ Firebase:', err);
    }

    $key.val(defaultKey);
    await checkGeminiConnection(defaultKey);
    return defaultKey;
  }

  async function switchLanguage(lang) {
    if (generating || listening) return;
    const isSameLang = (lang === currentLang);
    currentLang = lang;

    $('.lang-pill').removeClass('active');
    $(`.lang-pill[data-lang="${lang}"]`).addClass('active');

    if (recognition) {
      recognition.lang = (lang === 'zh') ? 'zh-CN' : 'en-US';
    }

    if (lang === 'zh') {
      $('#cappy-name').text('Language Cappy (中文)');
      $('#cappy-sub').html('● &nbsp;Hội thoại &amp; góp ý cùng Cappy');
      $('#message').attr('placeholder', 'Nhấn vào đây để gõ tiếng Hoa...');
      $('#keyboard-mode-bar').show();
      if (keyboardMode === 'pinyin') {
        showPinyinKeyboard();
      }
      $('#sample-list').html('<button type="button" class="sample">你好</button><button type="button" class="sample">你今天怎么样？</button><button type="button" class="sample">我喜欢学习中文。</button>');
      setStatus('Đã chọn tiếng Hoa. Nhấn Nói hoặc nhập câu của bạn.');
    } else {
      $('#cappy-name').text('Language Cappy (English)');
      $('#cappy-sub').html('● &nbsp;Hội thoại &amp; góp ý cùng Cappy');
      $('#message').attr('placeholder', 'Ví dụ: How are you?');
      $('#keyboard-mode-bar').hide();
      $('#kb-device-note').hide();
      $('#pinyin-keyboard-panel').hide();
      $('#sample-list').html('<button type="button" class="sample">How are you?</button><button type="button" class="sample">Hello</button><button type="button" class="sample">Yesterday I go to school</button>');
      setStatus('Đã chọn tiếng Anh. Nhấn Nói hoặc nhập câu của bạn.');
    }

    await fetchApiKeyForCurrentLang();
    if (!isSameLang) {
      startNewChat();
    }
  }

  async function checkGeminiConnection(keyToCheck) {
    const apiKey = (keyToCheck || $key.val() || '').trim();
    const $badge = $('#api-status-badge');
    const langName = (currentLang === 'zh') ? 'Tiếng Hoa' : 'Tiếng Anh';
    $badge.removeClass('success error').addClass('checking').text('Đang kiểm tra kết nối…');

    if (!apiKey) {
      $badge.removeClass('checking success').addClass('error').text('Chưa có API key');
      setStatus('Chưa có Cappy API key cho ' + langName + '. Hãy bấm "Tải lại từ Firebase".', true);
      return false;
    }

    try {
      const testUrl = 'https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + '?key=' + encodeURIComponent(apiKey);
      const res = await fetch(testUrl);
      if (res.ok) {
        $badge.removeClass('checking error').addClass('success').text('✓ Đã kết nối Cappy (' + langName + ')');
        setStatus('✓ Đã kết nối API Cappy ' + langName + ' thành công! Sẵn sàng trò chuyện.');
        return true;
      } else {
        const errText = explainApiError(res.status);
        $badge.removeClass('checking success').addClass('error').text('✗ Lỗi key ' + langName + ' (' + res.status + ')');
        setStatus('✗ Kết nối đến Cappy API thất bại: ' + errText, true);
        return false;
      }
    } catch (err) {
      $badge.removeClass('checking success').addClass('error').text('✗ Không kết nối được');
      setStatus('✗ Không thể kết nối tới Google Cappy. Hãy kiểm tra mạng Internet.', true);
      return false;
    }
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let listening = false;
  let waitingToSend = false;
  let generating = false;
  let gotResult = false;
  let recognitionError = '';
  let history = [];

  // Quản lý các phiên hội thoại (sessions)
  let currentSessionId = 'session_' + Date.now();
  let currentSessionTitle = '';
  let currentSessionMessages = [];
  let allSessions = {};

  function getLoggedInUserKey() {
    const user = sessionStorage.getItem('cappy_logged_user');
    if (!user) return '';
    return String(user).trim().toLowerCase().replace(/[.#$\[\]\/]/g, '_');
  }

  function formatDate(ts) {
    const d = new Date(ts);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return day + '/' + month + '/' + year + ' ' + hours + ':' + minutes;
  }

  function getSessionLang(sess) {
    if (!sess) return 'en';
    if (sess.lang === 'zh' || sess.lang === 'en') return sess.lang;
    const text = (sess.title || '') + ' ' + ((sess.messages && sess.messages[0] && sess.messages[0].text) || '');
    return /[\u4e00-\u9fa5]/.test(text) ? 'zh' : 'en';
  }

  function updateHistoryBadge() {
    const sessions = Object.values(allSessions || {});
    const enCount = sessions.filter(s => getSessionLang(s) === 'en').length;
    const zhCount = sessions.filter(s => getSessionLang(s) === 'zh').length;
    $('#history-badge-en').text(enCount);
    $('#history-badge-zh').text(zhCount);
    $('#history-count-en').text(enCount);
    $('#history-count-zh').text(zhCount);
    $('#history-count-all').text(sessions.length);
  }

  async function fetchAllSessions() {
    const userKey = getLoggedInUserKey();
    if (!userKey) {
      allSessions = {};
      updateHistoryBadge();
      return {};
    }
    try {
      const res = await fetch(FIREBASE_BASE_URL + '/sessions/' + encodeURIComponent(userKey) + '.json?t=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) throw new Error('Mã lỗi ' + res.status);
      const data = await res.json();
      allSessions = data || {};
      updateHistoryBadge();
      return allSessions;
    } catch (err) {
      console.warn('Lỗi tải danh sách session của ' + userKey + ':', err);
      return {};
    }
  }

  async function saveCurrentSessionToFirebase() {
    if (!currentSessionMessages.length) return;
    const userKey = getLoggedInUserKey();
    if (!userKey) return;

    try {
      const sessionData = {
        id: currentSessionId,
        user: userKey,
        lang: currentLang,
        title: currentSessionTitle || currentSessionMessages[0].text || (currentLang === 'zh' ? '中文对话' : 'Cuộc trò chuyện'),
        createdAt: currentSessionMessages[0].timestamp || Date.now(),
        updatedAt: Date.now(),
        dateStr: formatDate(currentSessionMessages[0].timestamp || Date.now()),
        messages: currentSessionMessages
      };
      allSessions[currentSessionId] = sessionData;
      updateHistoryBadge();

      await fetch(FIREBASE_BASE_URL + '/sessions/' + encodeURIComponent(userKey) + '/' + currentSessionId + '.json', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      });
    } catch (err) {
      console.warn('Lỗi lưu Firebase:', err);
    }
  }

  function loadSession(sess) {
    if (generating || listening) return;
    if (sess.lang && sess.lang !== currentLang) {
      currentLang = sess.lang;
      $('.lang-pill').removeClass('active');
      $(`.lang-pill[data-lang="${currentLang}"]`).addClass('active');
      if (currentLang === 'zh') {
        $('#cappy-name').text('Language Cappy (中文)');
        $('#message').attr('placeholder', 'Nhấn vào đây để gõ tiếng Hoa...');
        $('#keyboard-mode-bar').show();
        $('#sample-list').html('<button type="button" class="sample">你好</button><button type="button" class="sample">你今天怎么样？</button><button type="button" class="sample">我喜欢学习中文。</button>');
      } else {
        $('#cappy-name').text('Language Cappy (English)');
        $('#message').attr('placeholder', 'Ví dụ: How are you?');
        $('#keyboard-mode-bar').hide();
        $('#pinyin-keyboard-panel').hide();
        $('#sample-list').html('<button type="button" class="sample">How are you?</button><button type="button" class="sample">Hello</button><button type="button" class="sample">Yesterday I go to school</button>');
      }
      fetchApiKeyForCurrentLang();
    }

    currentSessionId = sess.id;
    currentSessionTitle = sess.title || '';
    currentSessionMessages = sess.messages || [];

    stopCurrentAudio();
    $messages.empty();

    history = [];
    currentSessionMessages.forEach(item => {
      if (item.role === 'user') {
        addMessage('user', item.text, false);
        history.push({ role: 'user', parts: [{ text: item.text }] });
      } else if (item.role === 'bot') {
        if (item.feedback) {
          addFeedback(item.feedback);
        }
        addMessage('bot', item.text, true, item.replyVi);
        history.push({ role: 'model', parts: [{ text: item.text }] });
      }
    });
    history = history.slice(-12);
    setStatus('Đang mở cuộc trò chuyện: "' + (sess.title || 'Lịch sử') + '" (' + currentSessionMessages.length + ' tin nhắn).');
  }

  function startNewChat() {
    if (generating || listening) return;
    currentSessionId = 'session_' + Date.now();
    currentSessionTitle = '';
    currentSessionMessages = [];
    history = [];

    stopCurrentAudio();
    $messages.empty();
    if (currentLang === 'zh') {
      addMessage('bot', '你好！你今天想聊什么？', true, 'Chào bạn! Hôm nay bạn muốn trò chuyện về chủ đề gì nào?');
      setStatus('Đã mở cuộc trò chuyện mới. Hãy nhập chủ đề của bạn bằng tiếng Hoa.');
    } else {
      addMessage('bot', 'Hi! What would you like to talk about today?', true, 'Chào bạn! Hôm nay bạn muốn trò chuyện về chủ đề gì nào?');
      setStatus('Đã mở cuộc trò chuyện mới. Hãy nhập chủ đề của bạn.');
    }
    $message.trigger('focus');
  }

  function renderHistoryModalList() {
    $historyList.empty();
    const allList = Object.values(allSessions || {});
    let list = allList;

    if (activeHistoryTab === 'en') {
      list = allList.filter(s => getSessionLang(s) === 'en');
    } else if (activeHistoryTab === 'zh') {
      list = allList.filter(s => getSessionLang(s) === 'zh');
    }

    if (!list.length) {
      const emptyMsg = (activeHistoryTab === 'zh')
        ? 'Chưa có cuộc trò chuyện Tiếng Hoa nào được lưu.<br>Hãy bắt đầu trò chuyện bằng tiếng Hoa nhé!'
        : (activeHistoryTab === 'en'
          ? 'Chưa có cuộc trò chuyện Tiếng Anh nào được lưu.<br>Hãy bắt đầu trò chuyện bằng tiếng Anh nhé!'
          : 'Chưa có cuộc trò chuyện nào được lưu.<br>Hãy bắt đầu trò chuyện để tạo chủ đề nhé!');
      $historyList.html(`<div class="history-empty">${emptyMsg}</div>`);
      return;
    }

    list.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));

    list.forEach(sess => {
      const $card = $('<div>').addClass('history-card');
      if (sess.id === currentSessionId) $card.addClass('active');

      const sessLang = getSessionLang(sess);
      const msgCount = (sess.messages && sess.messages.length) || 0;
      const $info = $('<div>').addClass('history-info').appendTo($card);
      const langTag = (sessLang === 'zh') ? '🇨🇳 ' : '🇬🇧 ';
      $('<div>').addClass('history-topic').text(langTag + (sess.title || (sessLang === 'zh' ? '中文对话' : 'Cuộc trò chuyện'))).appendTo($info);

      const $meta = $('<div>').addClass('history-meta').appendTo($info);
      $('<span>').text('📅 ' + (sess.dateStr || formatDate(sess.createdAt || Date.now()))).appendTo($meta);
      $('<span>').text('💬 ' + msgCount + ' câu').appendTo($meta);

      const $delBtn = $('<button>').attr({ type: 'button', title: 'Xóa cuộc trò chuyện này trên Firebase' })
        .addClass('btn-del-session').text('🗑️').appendTo($card);

      $delBtn.on('click', async function (e) {
        e.stopPropagation();
        const confirmed = window.confirm('Bạn có chắc muốn xóa cuộc trò chuyện "' + (sess.title || 'này') + '" trên Firebase?');
        if (!confirmed) return;

        const userKey = getLoggedInUserKey();
        if (!userKey) return;

        try {
          await fetch(FIREBASE_BASE_URL + '/sessions/' + encodeURIComponent(userKey) + '/' + sess.id + '.json', { method: 'DELETE' });
          delete allSessions[sess.id];
          updateHistoryBadge();
          renderHistoryModalList();

          if (sess.id === currentSessionId) {
            startNewChat();
          }
          setStatus('Đã xóa cuộc trò chuyện trên Firebase.');
        } catch (err) {
          setStatus('Không thể xóa: ' + err.message, true);
        }
      });

      $card.on('click', function () {
        loadSession(sess);
        closeHistoryModal();
      });

      $historyList.append($card);
    });
  }

  function openHistoryModal(tabLang) {
    activeHistoryTab = tabLang || currentLang || 'en';
    $('.history-tab-btn').removeClass('active');
    $(`.history-tab-btn[data-tab="${activeHistoryTab}"]`).addClass('active');

    const currentUser = getLoggedInUserKey();
    const userSuffix = currentUser ? ' (' + currentUser + ')' : '';
    const titleMap = {
      'en': '📜 Lịch sử hội thoại Tiếng Anh' + userSuffix,
      'zh': '📜 Lịch sử hội thoại Tiếng Hoa' + userSuffix,
      'all': '📜 Tất cả lịch sử hội thoại' + userSuffix
    };
    $('#history-modal-title').text(titleMap[activeHistoryTab] || ('📜 Lịch sử cuộc trò chuyện' + userSuffix));

    $historyModal.addClass('open');
    $historyList.html('<div class="history-loading">Đang tải danh sách từ Firebase…</div>');
    fetchAllSessions().then(() => {
      renderHistoryModalList();
    });
  }

  function closeHistoryModal() {
    $historyModal.removeClass('open');
  }

  async function clearAllSessionsFromFirebase() {
    if (generating || listening) return;
    const userKey = getLoggedInUserKey();
    if (!userKey) return;

    const allList = Object.values(allSessions || {});
    let targetSessions = allList;
    let confirmText = 'Bạn có chắc chắn muốn xóa TẤT CẢ các cuộc trò chuyện của bạn trên Firebase không?';

    if (activeHistoryTab === 'en') {
      targetSessions = allList.filter(s => getSessionLang(s) === 'en');
      confirmText = 'Bạn có chắc chắn muốn xóa tất cả cuộc trò chuyện TIẾNG ANH của bạn trên Firebase không?';
    } else if (activeHistoryTab === 'zh') {
      targetSessions = allList.filter(s => getSessionLang(s) === 'zh');
      confirmText = 'Bạn có chắc chắn muốn xóa tất cả cuộc trò chuyện TIẾNG HOA của bạn trên Firebase không?';
    }

    if (!targetSessions.length) {
      window.alert('Không có cuộc trò chuyện nào để xóa trong mục này.');
      return;
    }

    const confirmed = window.confirm(confirmText);
    if (!confirmed) return;

    try {
      $historyList.html('<div class="history-loading">Đang xóa trên Firebase…</div>');
      if (activeHistoryTab === 'all' && targetSessions.length === allList.length) {
        await fetch(FIREBASE_BASE_URL + '/sessions/' + encodeURIComponent(userKey) + '.json', { method: 'DELETE' });
        allSessions = {};
      } else {
        for (const s of targetSessions) {
          await fetch(FIREBASE_BASE_URL + '/sessions/' + encodeURIComponent(userKey) + '/' + s.id + '.json', { method: 'DELETE' });
          delete allSessions[s.id];
        }
      }
      updateHistoryBadge();
      renderHistoryModalList();
      startNewChat();
      setStatus('Đã xóa danh sách cuộc trò chuyện được chọn trên Firebase.');
    } catch (err) {
      setStatus('Lỗi khi xóa: ' + err.message, true);
    }
  }

  function setStatus(text, isError) {
    $status.text(text).toggleClass('error', !!isError);
  }

  function updateControls() {
    $send.prop('disabled', generating || waitingToSend);
    $message.prop('disabled', generating);
    $record.prop('disabled', !recognition || listening || generating);
    $newChatBtn.prop('disabled', listening || generating || waitingToSend);
    $openHistoryEnBtn.prop('disabled', generating || waitingToSend);
    $openHistoryZhBtn.prop('disabled', generating || waitingToSend);
    $('.sample').prop('disabled', listening || generating);
    $send.text(generating ? 'Đang chờ…' : waitingToSend ? 'Đang xử lý…' : 'Gửi  →');
  }

  async function translateText(text) {
    const apiKey = $key.val().trim();
    if (!apiKey) throw new Error('Chưa có API key.');
    const endpoint = API_URL + '?key=' + encodeURIComponent(apiKey);
    const prompt = (currentLang === 'zh')
      ? 'Translate this Chinese sentence to natural Vietnamese only. Do not add explanations or notes:\n"' + text + '"'
      : 'Translate this English sentence to natural Vietnamese only. Do not add explanations or notes:\n"' + text + '"';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }],
        generationConfig: { maxOutputTokens: 256 }
      })
    });
    if (!res.ok) throw new Error('Mã lỗi ' + res.status);
    const data = await res.json();
    const part = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0];
    const translation = (part && part.text || '').trim().replace(/^["']|["']$/g, '');
    if (!translation) throw new Error('Không nhận được bản dịch');
    return translation;
  }

  function addMessage(role, text, canReplay, translationVi) {
    const $row = $('<div>').addClass('row').addClass(role);
    $('<span>').addClass('speaker').text(role === 'user' ? 'Bạn' : (currentLang === 'zh' ? ' Cappy' : ' Cappy')).appendTo($row);
    $('<div>').addClass('bubble').text(text).appendTo($row);
    if (role === 'bot' && canReplay) {
      const $actions = $('<div>').addClass('bot-actions').appendTo($row);
      $('<button>').attr({ type: 'button', 'aria-label': 'Nghe lại câu trả lời' })
        .addClass('listen').text('🔊 Nghe lại').on('click', function () { speak(text); }).appendTo($actions);

      const $transBtn = $('<button>').attr({ type: 'button', 'aria-label': 'Dịch câu này sang tiếng Việt' })
        .addClass('translate-btn').text('🌐 Dịch tiếng Việt').appendTo($actions);

      const $transBox = $('<div>').addClass('translation-box').appendTo($row);

      $transBtn.on('click', async function () {
        if ($transBox.hasClass('visible')) {
          $transBox.removeClass('visible');
          $transBtn.text('🌐 Dịch tiếng Việt');
          return;
        }

        if ($transBox.text().trim()) {
          $transBox.addClass('visible');
          $transBtn.text('✕ Ẩn dịch');
          return;
        }

        if (translationVi) {
          $transBox.text(translationVi).addClass('visible');
          $transBtn.text('✕ Ẩn dịch');
          return;
        }

        $transBtn.text('⏳ Đang dịch…');
        try {
          const vi = await translateText(text);
          $transBox.text(vi).addClass('visible');
          $transBtn.text('✕ Ẩn dịch');
        } catch (err) {
          $transBtn.text('🌐 Dịch tiếng Việt');
          setStatus('Không thể dịch lúc này: ' + err.message, true);
        }
      });
    }
    $messages.append($row);
    $messages.scrollTop($messages[0].scrollHeight);
    return $row;
  }

  // Hiển thị nhận xét riêng, không trộn vào câu AI trả lời.
  function addFeedback(data) {
    const $panel = $('<div>').addClass('feedback').attr('aria-label', 'Nhận xét câu');
    if (data.assessment === 'correct') {
      $panel.addClass('feedback-ok');
      $('<span>').addClass('feedback-title').text('✓  Câu này có vẻ đúng và tự nhiên!').appendTo($panel);
    } else if (data.assessment === 'not_english' || data.assessment === 'not_target_lang') {
      $panel.addClass('feedback-warn');
      const warnTitle = (currentLang === 'zh') ? '⚠️ Vui lòng chỉ nói hoặc nhập tiếng Hoa' : '⚠️ Vui lòng chỉ nói hoặc nhập tiếng Anh';
      const defaultExp = (currentLang === 'zh') ? "我听不懂，请说中文。" : "I don't understand, please speak English.";
      $('<span>').addClass('feedback-title').text(warnTitle).appendTo($panel);
      $('<div>').addClass('feedback-explanation').text(data.explanationVi || defaultExp).appendTo($panel);
    } else {
      const title = data.assessment === 'correction'
        ? (currentLang === 'zh' ? '✦  Gợi ý sửa câu (中文)' : '✦  Gợi ý sửa câu')
        : (currentLang === 'zh' ? '✦  Cách nói tự nhiên hơn (中文)' : '✦  Cách nói tự nhiên hơn');
      $('<span>').addClass('feedback-title').text(title).appendTo($panel);
      $('<div>').addClass('feedback-suggestion').attr('lang', currentLang === 'zh' ? 'zh' : 'en').text(data.suggested).appendTo($panel);
      if (data.explanationVi) $('<div>').addClass('feedback-explanation').text(data.explanationVi).appendTo($panel);
      $('<button>').attr({ type: 'button', 'aria-label': 'Nghe câu gợi ý' })
        .addClass('feedback-listen').text(currentLang === 'zh' ? '🔊 Nghe câu gợi ý (中文)' : '🔊 Nghe câu gợi ý')
        .on('click', function () { speak(data.suggested); }).appendTo($panel);
    }
    $messages.append($panel);
    $messages.scrollTop($messages[0].scrollHeight);
  }

  function parseCoachResult(text) {
    let data;
    try {
      // Đề phòng API hoặc model vẫn bọc JSON trong markdown.
      const json = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      data = JSON.parse(json);
    } catch (error) {
      throw new Error('AI trả lời chưa đúng định dạng. Hãy nhấn Gửi để thử lại.');
    }
    const validAssessment = data && ['correct', 'correction', 'naturalness', 'not_english', 'not_target_lang'].includes(data.assessment);
    if (!validAssessment || typeof data.reply !== 'string' || !data.reply.trim() ||
      typeof data.suggested !== 'string' || typeof data.explanationVi !== 'string' ||
      ((data.assessment === 'correction' || data.assessment === 'naturalness') && !data.suggested.trim())) {
      throw new Error('AI trả lời chưa đầy đủ. Hãy nhấn Gửi để thử lại.');
    }
    return {
      assessment: data.assessment,
      suggested: data.suggested.trim(),
      explanationVi: data.explanationVi.trim(),
      reply: data.reply.trim(),
      replyVi: (typeof data.replyVi === 'string' ? data.replyVi.trim() : '')
    };
  }

  let currentAudio = null;

  function stopCurrentAudio() {
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      } catch (e) { }
      currentAudio = null;
    }
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) { }
    }
  }

  // Phát âm thanh trực tuyến miễn phí bằng Google Translate TTS (được mở khóa bởi <meta name="referrer" content="no-referrer">)
  function playOnlineTts(text, lang, onEnd) {
    try {
      const tl = (lang === 'zh') ? 'zh-CN' : 'en';
      const cleanText = text.replace(/[*#_~`]/g, '').trim();
      if (!cleanText) return;

      // Cắt văn bản theo từng đoạn tối đa 150 ký tự (giới hạn an toàn của Google Translate)
      const chunks = [];
      const regex = /[^,;.!?，。！？\n]+[,;.!?，。！？\n]*/g;
      let match;
      let currentChunk = '';
      while ((match = regex.exec(cleanText)) !== null) {
        if ((currentChunk + match[0]).length > 150) {
          if (currentChunk.trim()) chunks.push(currentChunk.trim());
          currentChunk = match[0];
        } else {
          currentChunk += match[0];
        }
      }
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      if (chunks.length === 0) chunks.push(cleanText.slice(0, 150));

      let index = 0;
      function playNext() {
        if (index >= chunks.length) {
          if (typeof onEnd === 'function') onEnd();
          return;
        }
        const chunk = chunks[index++];
        const url = 'https://translate.google.com/translate_tts?ie=UTF-8&tl=' + encodeURIComponent(tl) + '&client=tw-ob&q=' + encodeURIComponent(chunk);
        const audio = new Audio(url);
        currentAudio = audio;
        audio.onended = playNext;
        audio.onerror = function () {
          console.warn('Không thể tải đoạn audio:', chunk);
          playNext();
        };
        audio.play().catch(function (err) {
          console.warn('Lỗi audio play:', err);
          // Nếu bị trình duyệt chặn autoplay, thông báo nhẹ
          setStatus('Bấm nút 🔊 Nghe lại để phát âm thanh.', false);
        });
      }
      playNext();
    } catch (e) {
      console.warn('Lỗi playOnlineTts:', e);
    }
  }

  // Phát âm thanh tự động
  function speak(text) {
    if (!text || !text.trim()) return;
    stopCurrentAudio();

    // 1. Nếu là Tiếng Hoa:
    // Thử xem thiết bị có voice tiếng Hoa cài sẵn không
    if (currentLang === 'zh') {
      let hasZhNativeVoice = false;
      if ('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window) {
        const voices = window.speechSynthesis.getVoices() || [];
        hasZhNativeVoice = voices.some(function (v) {
          const l = (v.lang || '').toLowerCase();
          return l.startsWith('zh') || l.includes('chinese') || l.includes('cmn') || l.includes('mandarin');
        });
      }

      // Nếu có sẵn giọng zh trong máy tính hoặc điện thoại đã cài gói: dùng Web SpeechSynthesis
      if (hasZhNativeVoice) {
        try {
          const speech = new SpeechSynthesisUtterance(text);
          speech.lang = 'zh-CN';
          const voices = window.speechSynthesis.getVoices() || [];
          const zhVoice = voices.find(function (v) {
            const l = (v.lang || '').toLowerCase();
            return l.startsWith('zh') || l.includes('chinese') || l.includes('cmn') || l.includes('mandarin');
          });
          if (zhVoice) speech.voice = zhVoice;

          let played = false;
          speech.onstart = function () { played = true; };
          speech.onerror = function (event) {
            if (event.error !== 'interrupted' && event.error !== 'canceled') {
              // Fallback sang Google Translate TTS online nếu engine lỗi
              playOnlineTts(text, 'zh');
            }
          };
          // Nếu sau 1.5 giây engine của máy không phát ra tiếng (bệnh của Android Chrome), chuyển sang Google Translate Online
          setTimeout(function () {
            if (!played) {
              window.speechSynthesis.cancel();
              playOnlineTts(text, 'zh');
            }
          }, 1500);

          window.speechSynthesis.resume();
          window.speechSynthesis.speak(speech);
          return;
        } catch (e) {
          console.warn('SpeechSynthesis zh error, fallback online:', e);
        }
      }

      // Nếu máy không có sẵn giọng tiếng Hoa (điện thoại Android chưa tải gói giọng):
      // Dùng luôn Google Translate TTS online cực kỳ mượt và chuẩn 100%!
      playOnlineTts(text, 'zh');
      return;
    }

    // 2. Nếu là Tiếng Anh:
    if ('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window) {
      function doSpeakEn() {
        try {
          const voices = window.speechSynthesis.getVoices() || [];
          const speech = new SpeechSynthesisUtterance(text);
          speech.lang = 'en-US';
          const enVoice = voices.find(function (v) { return v.lang.toLowerCase() === 'en-us'; }) ||
            voices.find(function (v) { return v.lang.toLowerCase().startsWith('en'); });
          if (enVoice) speech.voice = enVoice;

          speech.onerror = function (event) {
            if (event.error !== 'interrupted' && event.error !== 'canceled') {
              playOnlineTts(text, 'en');
            }
          };

          window.speechSynthesis.resume();
          window.speechSynthesis.speak(speech);
        } catch (e) {
          playOnlineTts(text, 'en');
        }
      }

      const voices = window.speechSynthesis.getVoices() || [];
      if (voices.length > 0) {
        doSpeakEn();
      } else {
        let fired = false;
        window.speechSynthesis.onvoiceschanged = function () {
          if (fired) return;
          fired = true;
          window.speechSynthesis.onvoiceschanged = null;
          doSpeakEn();
        };
        setTimeout(function () {
          if (!fired) {
            fired = true;
            window.speechSynthesis.onvoiceschanged = null;
            doSpeakEn();
          }
        }, 800);
      }
    } else {
      playOnlineTts(text, 'en');
    }
  }

  function explainApiError(status) {
    if (status === 400) return 'Yêu cầu không hợp lệ hoặc API key sai. Hãy kiểm tra API key và thử lại.';
    if (status === 401 || status === 403) return 'API key không hợp lệ hoặc chưa có quyền dùng Cappy. Hãy kiểm tra key và project trong AI Studio.';
    if (status === 404) return 'Model Cappy không khả dụng với project của bạn. Hãy kiểm tra model trong Google AI Studio.';
    if (status === 429) return 'Đã chạm giới hạn sử dụng. Hãy chờ rồi thử lại hoặc xem hạn mức Free Tier trong AI Studio.';
    if (status >= 500) return 'Dịch vụ Cappy đang gặp lỗi. Bạn hãy thử lại sau.';
    return 'Cappy trả về lỗi ' + status + '. Hãy kiểm tra API key và thử lại.';
  }

  async function sendMessage() {
    if (generating) return;
    const text = $message.val().trim();
    if (!text) {
      setStatus('Bạn hãy nói hoặc nhập một câu trước nhé.', true);
      $message.trigger('focus');
      return;
    }

    // Kiểm tra ngôn ngữ theo tab đang chọn
    if (currentLang === 'en') {
      const NON_ENGLISH_REGEX = /[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ\u0400-\u04FF\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u0600-\u06FF]/i;
      if (NON_ENGLISH_REGEX.test(text)) {
        setStatus("I don't understand, please speak English.", true);
        speak("I don't understand, please speak English.");
        $message.trigger('focus');
        return;
      }
    } else if (currentLang === 'zh') {
      const VIETNAMESE_REGEX = /[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i;
      if (VIETNAMESE_REGEX.test(text)) {
        setStatus("我听不懂，请说中文 (Vui lòng chỉ nói hoặc gõ tiếng Hoa).", true);
        speak("我听不懂，请说中文。");
        $message.trigger('focus');
        return;
      }
    }

    // Lấy API key từ ô nhập
    const apiKey = $key.val().trim();
    if (!apiKey) {
      setStatus('Bạn hãy nhập Cappy API key trước khi gửi (hoặc nhấn nút "Tải lại từ Firebase").', true);
      $key.trigger('focus');
      return;
    }

    if (!currentSessionTitle) {
      currentSessionTitle = text.length > 40 ? text.substring(0, 40) + '…' : text;
    }
    currentSessionMessages.push({
      role: 'user',
      text: text,
      timestamp: Date.now()
    });
    saveCurrentSessionToFirebase();

    const nextHistory = history.concat([{ role: 'user', parts: [{ text: text }] }]);
    const $userRow = addMessage('user', text, false);
    const $thinking = addMessage('bot', 'Đang suy nghĩ…', false);
    $message.val('');
    generating = true;
    updateControls();
    setStatus('Đang gửi câu nói tới Cappy…');

    const controller = new AbortController();
    const timeout = window.setTimeout(function () { controller.abort(); }, 60000);
    try {
      const endpoint = API_URL + '?key=' + encodeURIComponent(apiKey);
      const activeSystemPrompt = (currentLang === 'zh') ? SYSTEM_PROMPT_ZH : SYSTEM_PROMPT_EN;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: activeSystemPrompt }] },
          contents: nextHistory,
          // Yêu cầu Cappy trả về JSON có cấu trúc để tách nhận xét, gợi ý và câu trả lời.
          generationConfig: {
            maxOutputTokens: 1024,
            responseMimeType: 'application/json',
            responseSchema: COACH_SCHEMA
          }
        }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(explainApiError(response.status));
      const result = await response.json();
      const candidate = result.candidates && result.candidates[0];
      const parts = candidate && candidate.content && candidate.content.parts || [];
      const rawText = parts.filter(function (part) { return !part.thought && typeof part.text === 'string'; })
        .map(function (part) { return part.text; }).join('').trim();
      if (!rawText) {
        if ((result.promptFeedback && result.promptFeedback.blockReason) ||
          (candidate && candidate.finishReason === 'SAFETY')) {
          throw new Error('Cappy không thể trả lời câu này. Hãy thử một câu khác.');
        }
        throw new Error('Cappy chưa trả về câu trả lời. Hãy thử một câu ngắn hơn.');
      }
      const feedback = parseCoachResult(rawText);
      history = nextHistory.concat([{ role: 'model', parts: parts }]).slice(-12);
      $thinking.remove();
      addFeedback(feedback);
      addMessage('bot', feedback.reply, true, feedback.replyVi);
      currentSessionMessages.push({
        role: 'bot',
        text: feedback.reply,
        replyVi: feedback.replyVi,
        feedback: feedback,
        timestamp: Date.now()
      });
      saveCurrentSessionToFirebase();
      if (feedback.assessment === 'not_english' || feedback.assessment === 'not_target_lang') {
        setStatus(currentLang === 'zh' ? "我听不懂，请说中文。" : "I don't understand, please speak English.", true);
      } else {
        setStatus('Đã nhận xét và trả lời. Bạn có thể nghe lại hoặc nhấn "Dịch tiếng Việt".');
      }
      speak(feedback.reply);
    } catch (error) {
      $thinking.remove();
      $userRow.remove();
      $message.val(text);
      if (error.name === 'AbortError') {
        setStatus('Cappy phản hồi quá lâu. Hãy thử gửi lại.', true);
      } else if (error.name === 'TypeError') {
        setStatus('Không kết nối được Cappy. Hãy kiểm tra Internet và mở trang bằng localhost hoặc HTTPS.', true);
      } else {
        setStatus(error.message || 'Có lỗi xảy ra. Hãy thử lại.', true);
      }
    } finally {
      window.clearTimeout(timeout);
      generating = false;
      updateControls();
    }
  }

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = (currentLang === 'zh') ? 'zh-CN' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = function () {
      setStatus(currentLang === 'zh' ? 'Đang nghe… Hãy nói một câu bằng tiếng Hoa.' : 'Đang nghe… Hãy nói một câu bằng tiếng Anh.');
      $record.text('🎙️  Đang nghe');
    };
    recognition.onresult = function (event) {
      const transcript = event.results[0][0].transcript;
      $message.val(transcript);
      gotResult = true;
      if (currentLang === 'en') {
        const NON_ENGLISH_REGEX = /[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ\u0400-\u04FF\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u0600-\u06FF]/i;
        if (NON_ENGLISH_REGEX.test(transcript)) {
          recognitionError = "I don't understand, please speak English.";
          setStatus(recognitionError, true);
          speak("I don't understand, please speak English.");
        }
      } else if (currentLang === 'zh') {
        const VIETNAMESE_REGEX = /[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i;
        if (VIETNAMESE_REGEX.test(transcript)) {
          recognitionError = "我听不懂，请说中文。";
          setStatus("我听不懂，请说中文 (Vui lòng chỉ nói tiếng Hoa).", true);
          speak("我听不懂，请说中文。");
        }
      }
    };
    recognition.onerror = function (event) {
      const errors = {
        'not-allowed': 'Micro chưa được cấp quyền. Hãy cho phép truy cập micro trong trình duyệt.',
        'service-not-allowed': 'Trình duyệt không cho phép dịch vụ nhận dạng giọng nói.',
        'audio-capture': 'Không tìm thấy micro. Hãy kiểm tra thiết bị của bạn.',
        'no-speech': 'Chưa nghe được lời nói. Hãy thử lại hoặc nhập bằng bàn phím.',
        'network': 'Nhận dạng giọng nói cần kết nối mạng. Hãy kiểm tra kết nối.',
        'aborted': 'Đã dừng nhận dạng giọng nói.'
      };
      recognitionError = errors[event.error] || 'Không nhận dạng được giọng nói. Hãy thử lại hoặc nhập bằng bàn phím.';
      setStatus(recognitionError, true);
    };
    recognition.onend = function () {
      listening = false;
      $record.text('🎙️  Nói');
      const sendAfterRecognition = waitingToSend;
      waitingToSend = false;
      updateControls();
      if (sendAfterRecognition) {
        if ($message.val().trim()) sendMessage();
        else if (!recognitionError) setStatus('Chưa nghe được lời nói. Hãy thử lại hoặc nhập bằng bàn phím.', true);
      } else if (!recognitionError) {
        setStatus(gotResult ? 'Đã nhận dạng. Kiểm tra nội dung rồi nhấn Gửi.' : 'Nhấn Nói hoặc nhập câu của bạn.');
      }
    };
  } else {
    $record.attr('title', 'Trình duyệt không hỗ trợ nhận dạng giọng nói');
    setStatus('Trình duyệt không hỗ trợ nhận dạng giọng nói. Bạn vẫn có thể nhập bằng bàn phím.', true);
  }
  updateControls();

  $record.on('click', function () {
    if (!recognition || listening || generating) return;
    gotResult = false;
    recognitionError = '';
    try {
      stopCurrentAudio();
      listening = true;
      updateControls();
      recognition.start();
    } catch (error) {
      listening = false;
      updateControls();
      $record.text('🎙️  Nói');
      setStatus('Không khởi động được micro. Hãy kiểm tra quyền truy cập và thử lại.', true);
    }
  });

  $('#chat-form').on('submit', function (event) {
    event.preventDefault();
    if (generating || waitingToSend) return;
    if (listening && recognition) {
      waitingToSend = true;
      updateControls();
      setStatus('Đang hoàn tất nhận dạng giọng nói…');
      try { recognition.stop(); }
      catch (error) {
        waitingToSend = false;
        updateControls();
        setStatus('Chưa thể dừng micro. Hãy chờ một chút rồi nhấn Gửi lại.', true);
      }
      return;
    }
    sendMessage();
  });

  // Sự kiện chọn tab ngôn ngữ
  $('.lang-pill').on('click', function () {
    const lang = $(this).data('lang');
    switchLanguage(lang);
  });

  // Sự kiện chuyển đổi chế độ bàn phím
  $('#btn-toggle-pinyin-kb').on('click', function () {
    if ($('#pinyin-keyboard-panel').is(':visible')) {
      hidePinyinKeyboard();
    } else {
      showPinyinKeyboard();
    }
  });

  $('#btn-device-kb').on('click', function () {
    keyboardMode = 'device';
    $('#btn-device-kb').addClass('active');
    $('#btn-toggle-pinyin-kb').removeClass('active').text('⌨️ Bàn phím Pinyin');
    $('#pinyin-keyboard-panel').slideUp(150);
    $('#kb-device-note').slideDown(150);
    $message.trigger('focus');
  });

  $('#close-pinyin-panel').on('click', function () {
    hidePinyinKeyboard();
  });

  $('#pinyin-clear-btn').on('click', function () {
    clearCurrentPinyin();
  });

  // Nhấn phím ký tự Pinyin trên bàn phím ảo (q-p, a-l, z-m)
  $(document).on('click', '.vk-key[data-key]', function () {
    const key = $(this).data('key');
    appendPinyinChar(key);
  });

  // Nhấn phím Backspace trên bàn phím ảo
  $('#vk-backspace').on('click', function () {
    removeLastPinyinChar();
  });

  // Nhấn phím dấu câu ảo
  $(document).on('click', '.vk-key[data-insert]', function () {
    const char = $(this).data('insert');
    insertTextIntoMessage(char);
  });

  // Khi nhấn vào ô chat trong chế độ tiếng Hoa
  $message.on('focus click', function () {
    if (currentLang === 'zh' && keyboardMode === 'pinyin' && !$('#pinyin-keyboard-panel').is(':visible')) {
      showPinyinKeyboard();
    }
  });

  // Bắt phím bàn phím vật lý khi đang mở bàn phím Pinyin ảo
  $(document).on('keydown', function (e) {
    if (currentLang !== 'zh' || keyboardMode !== 'pinyin' || !$('#pinyin-keyboard-panel').is(':visible')) return;
    // Bỏ qua nếu đang gõ vào ô cấu hình API key
    if ($(e.target).is('#api-key')) return;

    // Gõ phím a-z
    if (e.key && e.key.length === 1 && /[a-zA-Z]/.test(e.key) && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      appendPinyinChar(e.key);
      return;
    }

    // Nhấn số 1-9 để chọn từ gợi ý
    if (e.key >= '1' && e.key <= '9' && currentCandidates.length > 0) {
      const idx = parseInt(e.key, 10) - 1;
      if (currentCandidates[idx]) {
        e.preventDefault();
        insertTextIntoMessage(currentCandidates[idx]);
        clearCurrentPinyin();
        return;
      }
    }

    // Nhấn phím cách (Space) để chọn từ gợi ý đầu tiên
    if (e.key === ' ' || e.code === 'Space') {
      if (currentCandidates.length > 0) {
        e.preventDefault();
        insertTextIntoMessage(currentCandidates[0]);
        clearCurrentPinyin();
        return;
      }
    }

    // Nhấn Backspace để xóa ký tự pinyin đang gõ
    if (e.key === 'Backspace' && currentPinyin.length > 0) {
      e.preventDefault();
      removeLastPinyinChar();
      return;
    }

    // Nhấn Escape để đóng bàn phím Pinyin
    if (e.key === 'Escape') {
      hidePinyinKeyboard();
      return;
    }
  });

  // Click câu mẫu (dùng event delegation)
  $(document).on('click', '.sample', function () {
    $message.val($(this).text()).trigger('focus');
    setStatus('Đã chọn câu mẫu. Nhấn Gửi để trò chuyện.');
  });

  $newChatBtn.on('click', startNewChat);

  $openHistoryEnBtn.on('click', function () {
    openHistoryModal('en');
  });

  $openHistoryZhBtn.on('click', function () {
    openHistoryModal('zh');
  });

  $closeHistoryModal.on('click', closeHistoryModal);
  $clearAllSessionsBtn.on('click', clearAllSessionsFromFirebase);

  // Chuyển tab lọc trong modal lịch sử
  $('.history-tab-btn').on('click', function () {
    const tab = $(this).data('tab');
    activeHistoryTab = tab;
    $('.history-tab-btn').removeClass('active');
    $(this).addClass('active');

    const titleMap = {
      'en': '📜 Lịch sử hội thoại Tiếng Anh',
      'zh': '📜 Lịch sử hội thoại Tiếng Hoa',
      'all': '📜 Tất cả lịch sử hội thoại'
    };
    $('#history-modal-title').text(titleMap[activeHistoryTab] || '📜 Lịch sử cuộc trò chuyện');

    renderHistoryModalList();
  });

  // Đóng modal khi bấm vào vùng nền bên ngoài hộp thoại
  $historyModal.on('click', function (e) {
    if ($(e.target).is($historyModal)) {
      closeHistoryModal();
    }
  });

  // Bắt sự kiện thay đổi API key
  $key.on('change input', function () {
    checkGeminiConnection($key.val());
  });

  // Hiện / ẩn API key (dùng native property để hỗ trợ tốt nhất trên mọi trình duyệt)
  $(document).on('click', '#toggle-key-visibility', function (e) {
    e.preventDefault();
    const inputEl = document.getElementById('api-key');
    if (!inputEl) return;
    const isPassword = inputEl.type === 'password';
    inputEl.type = isPassword ? 'text' : 'password';
    $(this).text(isPassword ? 'Ẩn key' : 'Hiện key');
  });

  // Nút tải lại key từ Firebase
  $(document).on('click', '#reset-default-key', async function (e) {
    e.preventDefault();
    setStatus('Đang tải lại API key từ Firebase…');
    await fetchApiKeyForCurrentLang();
  });

  // ============================================================
  // HỆ THỐNG XÁC THỰC ĐĂNG NHẬP QUA FIREBASE ONLINE
  // ============================================================
  const $loginScreen = $('#login-screen');
  const $mainApp = $('#main-app');
  const $loginForm = $('#login-form');
  const $loginUsername = $('#login-username');
  const $loginPassword = $('#login-password');
  const $loginSubmitBtn = $('#login-submit-btn');
  const $loginBtnText = $('#login-btn-text');
  const $loginErrorMsg = $('#login-error-msg');
  const $loginTogglePass = $('#login-toggle-pass');
  const $logoutBtn = $('#logout-btn');

  // Ẩn / hiện mật khẩu khung đăng nhập
  $loginTogglePass.on('click', function () {
    const passEl = document.getElementById('login-password');
    if (!passEl) return;
    const isPass = passEl.type === 'password';
    passEl.type = isPass ? 'text' : 'password';
    $loginTogglePass.text(isPass ? '🙈' : '👁️');
  });

  // Hàm mở giao diện chính sau khi đăng nhập thành công
  function unlockApp(username, userInt) {
    $loginScreen.fadeOut(250, function () {
      $mainApp.fadeIn(250);
    });
    sessionStorage.setItem('cappy_logged_user', username);
    if (userInt !== undefined && userInt !== null) {
      sessionStorage.setItem('cappy_user_int', String(userInt));
    }
    $('#logged-username-display').text(username);
    allSessions = {};
    updateHistoryBadge();
    // Tải các tài nguyên cần thiết
    startNewChat();
    fetchAllSessions();
    fetchApiKeyForCurrentLang();
  }

  // Xử lý gửi form đăng nhập
  $loginForm.on('submit', async function (e) {
    e.preventDefault();
    const username = $loginUsername.val().trim().toLowerCase();
    const password = $loginPassword.val();

    $loginErrorMsg.hide().text('');

    if (!username || !password) {
      $loginErrorMsg.text('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.').fadeIn(200);
      return;
    }

    $loginSubmitBtn.prop('disabled', true);
    $loginBtnText.text('Đang kiểm tra thông tin…');

    try {
      // Lấy dữ liệu user từ Firebase online
      const userUrl = FIREBASE_BASE_URL + '/users/' + encodeURIComponent(username) + '.json?t=' + Date.now();
      const res = await fetch(userUrl, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Lỗi kết nối Firebase');
      }
      const userData = await res.json();

      // Kiểm tra tài khoản và mật khẩu
      if (userData && userData.password && userData.password === password) {
        // Đăng nhập thành công!
        $loginBtnText.text('Đăng nhập thành công! ✓');
        setTimeout(function () {
          unlockApp(username, userData.int);
          $loginSubmitBtn.prop('disabled', false);
          $loginBtnText.text('Đăng nhập');
        }, 300);
      } else {
        // Sai tên đăng nhập hoặc mật khẩu
        $loginErrorMsg.text('Tên đăng nhập hoặc mật khẩu không chính xác.').fadeIn(200);
        $loginPassword.val('').trigger('focus');
        $loginSubmitBtn.prop('disabled', false);
        $loginBtnText.text('Đăng nhập');
      }
    } catch (err) {
      console.error('Lỗi kiểm tra đăng nhập:', err);
      $loginErrorMsg.text('Không thể kết nối đến máy chủ để xác thực. Vui lòng kiểm tra mạng.').fadeIn(200);
      $loginSubmitBtn.prop('disabled', false);
      $loginBtnText.text('Đăng nhập');
    }
  });

  // Nút Đăng xuất
  $logoutBtn.on('click', function () {
    if (confirm('Bạn có chắc muốn đăng xuất khỏi Cappy?')) {
      sessionStorage.removeItem('cappy_logged_user');
      sessionStorage.removeItem('cappy_user_int');
      allSessions = {};
      updateHistoryBadge();
      stopCurrentAudio();
      $messages.empty();
      $('#logged-username-display').text('');
      $loginPassword.val('');
      $loginErrorMsg.hide().text('');
      $mainApp.hide();
      $loginScreen.fadeIn(200);
      $loginUsername.trigger('focus');
    }
  });

  // Kiểm tra trạng thái đăng nhập khi load trang
  const loggedUser = sessionStorage.getItem('cappy_logged_user');
  if (loggedUser) {
    $('#logged-username-display').text(loggedUser);
    $loginScreen.hide();
    $mainApp.show();
    startNewChat();
    fetchAllSessions();
    fetchApiKeyForCurrentLang();
  } else {
    allSessions = {};
    updateHistoryBadge();
    $mainApp.hide();
    $loginScreen.show();
    $loginUsername.trigger('focus');
  }

  // ============================================================
  // HIỆU ỨNG HẠT TUYẾT / ÁNH SÁNG RƠI ĐỘNG (FALLING PARTICLES)
  // ============================================================
  const snowCanvas = document.getElementById('snow-canvas');
  if (snowCanvas) {
    const sCtx = snowCanvas.getContext('2d');
    let sWidth = snowCanvas.width = window.innerWidth;
    let sHeight = snowCanvas.height = window.innerHeight;

    window.addEventListener('resize', function () {
      sWidth = snowCanvas.width = window.innerWidth;
      sHeight = snowCanvas.height = window.innerHeight;
    });

    const SNOW_COUNT = 70;
    const snowParticles = [];

    for (let i = 0; i < SNOW_COUNT; i++) {
      snowParticles.push({
        x: Math.random() * sWidth,
        y: Math.random() * sHeight,
        radius: Math.random() * 2.2 + 0.8,
        speedY: Math.random() * 1.2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.6 + 0.35,
        swingAngle: Math.random() * Math.PI * 2,
        swingSpeed: Math.random() * 0.02 + 0.01
      });
    }

    function animateSnow() {
      sCtx.clearRect(0, 0, sWidth, sHeight);
      for (let i = 0; i < snowParticles.length; i++) {
        const p = snowParticles[i];
        p.swingAngle += p.swingSpeed;
        p.y += p.speedY;
        p.x += p.speedX + Math.sin(p.swingAngle) * 0.45;

        if (p.y > sHeight + 5) {
          p.y = -5;
          p.x = Math.random() * sWidth;
        }
        if (p.x > sWidth + 5) p.x = -5;
        else if (p.x < -5) p.x = sWidth + 5;

        sCtx.beginPath();
        sCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        sCtx.fillStyle = 'rgba(255, 255, 255, ' + p.opacity + ')';
        sCtx.fill();
      }
      requestAnimationFrame(animateSnow);
    }
    animateSnow();
  }
});
